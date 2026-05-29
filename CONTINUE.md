## 项目身份

PDS（PID Performance Assessment & Tuning System）—— 化工装置 PID 控制回路性能评估与参数整定系统。标准化软件产品，目标 3+ 化工企业客户，符合 GB/T 44693.2-2024 标准。

技术栈：FastAPI + PostgreSQL + TDengine + React (Vite)。部署形态：Docker Compose 四服务（postgres:16 + tdengine:3.3.6 + backend + nginx 前端）。

## 已完成的工作（截至 2026-05-29）

1. **后端启动/迁移链路修复**：`alembic.ini` 路径从 CWD 相对改为 app 绝对路径；新增 `0002_monitoring_aggregates` 迁移。
2. **Mock 数据仿真修复**：sample_interval 从 1s → 60s，内部 1s 步长积分 + 降采样，消除数值溢出，Assessment API 从超时降到 ~6s。
3. **前端产品壳收敛**：全局 Layout（生命周期导航、顶栏、信任条）、Overview/Monitoring/Assessment/Reports/Settings 六页面正式产品化改造。
4. **设计系统修复**：`--text` #d0d8e0→#334155（表格文字对比度 1.5→7.5:1）；`--bg-soft` #eef2f6→#e2e8f0（卡片/页面背景分离）；`--line` #dce4ec→#cbd5e1（边框可见）；`--text-subtle`、`--text-dim` 对比度修复。
5. **Alembic 基线入库**：0001_baseline（29 张表）+ 0002_monitoring_aggregates。
6. **缺失文件补入库**：bootstrap、runtime_provider、migrations、production models、health、多个 router/service 等 24 个文件。
7. 仓库地址：`https://github.com/hlszp/iPDS`，分支 `main`，已推送。

## 当前测试状态

- 后端：40 passed (pytest)
- 前端：12 passed (vitest)，构建通过
- 全部 6 个页面浏览器验收 0 console error

## 距正式部署投运的差距（按优先级）

### P0 — 阻塞首次客户投运

1. **真实 TDengine 集成验证**：代码（`tdengine_repository.py`、`TdengineRuntimeProvider`）存在但从未在真实 TDengine 上运行。需搭建环境 → 写入真实时序数据 → 验证读取链路 → 验证降级路径 → 性能基准。
2. **历史聚合数据管道**：`monitoring_aggregate_snapshots` 表已创建，但无数据写入逻辑。`/api/monitoring/history` 始终返回空数组。需要 APScheduler job 定时聚合写入小时/天/月维度快照。
3. **报表异常分层**：`reports.py` 用 catch-all 500。需定义异常分类（回路不存在 404 / 数据源不可用 / 渲染失败 / 持久化失败），job 状态机，失败可追踪。
4. **生产安全配置**：JWT 密钥默认值、CORS 全开、密码无复杂度要求、token 无刷新机制。

### P1 — 投运前应完成

5. **Runtime Trust Contract 统一**：当前每页各自从 `runtime_provider.snapshot.__dict__` 取字段。需定义 `RuntimeTrustSummary` + `AnalysisEvidence`共享 schema，所有页面统一消费。
6. **数据源切换控制面**：Settings 页面切换 mock/tdengine 无权限检查、无审计记录。需 admin-only + audit_event + 生产环境禁止 mock。
7. **装置回路树接入**：侧边栏 PlantTree 显示"暂无数据"——需接入 `/api/plants/tree` 数据。
8. **发布编排文档**：显式 rollout/rollback 步骤（迁移→回填→双读→前端启用→收紧策略）。
9. **测试覆盖率**：当前估计约 40%，目标 > 80%。

### P2 — 投运后迭代

10. **Workflow Context 统一**：页面间裸 URL 跳转改为统一 handoff 协议（来源页、回路 tag、建议动作、返回路径）。
11. **API 版本化**：`/api/...` → `/api/v1/...`。
12. **结构化日志**：JSON + trace_id 替代 print/uvicorn 默认日志。
13. **CI/CD**：GitHub Actions（测试 + 构建）。
14. **前端体验**：骨架屏、品牌化错误页面、大屏模式双分辨率验证。
15. **国产 OS 验证 + 离线镜像包**。

### 明确 NOT in scope

Celery/Redis、报警管理、AD/LDAP 集成、整定一键下发 DCS、移动端推送、多租户平台。

## 接下来建议做

1. **P0 优先**：先修历史聚合数据管道（表已有，只需补写入逻辑 + APScheduler job），这是最纯粹的工程任务。
2. **紧接着**：报表异常分层（涉及 `reports.py` + `jobs.py` + `reporting/engine.py`），完善服务放大器入口。
3. **真实 TDengine 集成**：需要硬件/环境，如果暂时不具备，至少写一个 TDengine mock 适配器让集成测试可跑。

## 关键文件索引

| 关注点 | 文件 |
|--------|------|
| 后端入口 + 生命周期 | `backend/app/main.py` |
| 迁移编排 | `backend/app/migrations.py` |
| 启动引导 | `backend/app/bootstrap.py` |
| 运行时数据源管理 | `backend/app/data/runtime_provider.py` |
| Mock 数据生成 | `backend/app/data/mock.py` |
| 评估引擎 | `backend/app/services/assessment/engine.py` |
| 诊断引擎 | `backend/app/services/diagnosis/engine.py` |
| 报表服务 | `backend/app/services/reporting/engine.py` |
| 作业管理 | `backend/app/services/jobs.py` |
| 快照持久化 | `backend/app/services/snapshots.py` |
| 生产数据模型 | `backend/app/models/production.py` |
| 前端 API 客户端 | `frontend/src/api/client.js` |
| 全局设计 Token | `frontend/src/styles/global.css` |
| 布局组件 | `frontend/src/components/Layout.jsx` |
| 项目计划 | `PLAN.md` |
| 项目小结 | `PROJECT_SUMMARY.md` |
| Agent 指导 | `CLAUDE.md` / `AGENTS.md` |

## 常用命令

```bash
# 启动后端（从项目根目录）
source backend/venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload

# 启动前端
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5173

# 后端测试
cd backend && source venv/bin/activate && pytest

# 前端测试
cd frontend && npm run test:run

# 前端构建
cd frontend && npm run build

# Docker 栈
docker compose up -d --build
docker compose down

# Alembic 迁移（手动）
cd backend && source venv/bin/activate && alembic upgrade head

# 浏览器验收
前端 http://127.0.0.1:5173/ → 确认 Overview/Monitoring/Assessment/Reports/Settings 六页面 0 error

# Git
git log --oneline -10  # 了解最近提交
```

## 上次结束时的服务器状态

**已停止**。启动命令见上方"常用命令"。
