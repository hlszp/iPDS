# PDS 项目小结

PID Performance Assessment & Tuning System — 化工装置 PID 控制回路性能评估与参数整定系统。标准化软件产品，目标 3+ 化工企业客户，符合 GB/T 44693.2-2024 标准。

## 1. 技术架构

| 层 | 技术选型 |
|---|---------|
| 后端框架 | Python FastAPI (Uvicorn) |
| ORM | SQLAlchemy 2.0 |
| 配置数据库 | SQLite（开发）/ PostgreSQL 16（生产） |
| 时序数据库 | TDengine 3.3.6 |
| 认证 | JWT (HS256) + PBKDF2 密码哈希 |
| 前端框架 | React 18 + Vite 5 |
| 路由 | react-router-dom v6 |
| 图表 | ECharts 5.5 |
| 样式 | CSS Modules + CSS 自定义属性 |
| PDF 报告 | WeasyPrint（可降级为 HTML） |
| 测试 | Vitest（前端）、pytest（后端） |
| 部署 | Docker Compose（4 服务：PostgreSQL + TDengine + 后端 + 前端） |

### 目录结构

```
PDS/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口、中间件、生命周期
│   │   ├── bootstrap.py         # 启动初始化（管理员、功能开关、种子数据）
│   │   ├── migrations.py        # Alembic 迁移编排
│   │   ├── main_seed.py         # 开发环境种子数据
│   │   ├── health.py            # 健康检查端点
│   │   ├── config/              # 配置管理（settings.py + features.py）
│   │   ├── auth/                # JWT 签发 + 角色依赖
│   │   ├── routers/             # 15 个路由模块
│   │   ├── services/            # 6 个领域引擎 + 辅助服务
│   │   ├── models/              # ORM 模型 + Pydantic schema
│   │   ├── data/                # 数据库引擎、运行时数据源、Mock 数据
│   │   └── utils/               # 异常定义
│   ├── alembic/                 # 数据库迁移脚本
│   ├── tests/                   # pytest 测试套件
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # 路由外壳
│   │   ├── api/client.js        # HTTP 客户端（JWT 注入、401 拦截）
│   │   ├── components/          # 共享组件（Layout、SortableTable、LargeScreenMode）
│   │   ├── pages/               # 16 个页面目录
│   │   └── styles/global.css    # 设计 Token
│   ├── dist/                    # Vite 构建产物
│   └── package.json
├── docker-compose.yml           # PostgreSQL + TDengine + 后端 + 前端
├── deploy/                      # 部署制品
├── CLAUDE.md / AGENTS.md        # AI Agent 指导
└── PLAN.md                      # 项目计划
```

## 2. 核心功能模块

### 模块一：总览（Overview）

全景驾驶舱，面向仪表工程师的日常入口。

| 功能 | 说明 |
|------|------|
| 自控率仪表盘 | 自动回路 / 总回路比例 |
| KPI 面板 | 上一整点评分、自控率、平稳率 |
| 装置导航 | 厂→装置→回路组三级树形导航 |
| 等级分布 | 优/良/中/差/开环五级统计，可点击筛选 |
| 详情表 | 回路组级聚合：评分、自控率、平稳率、等级分布，支持排序/搜索/筛选 |
| 重点回路 | 最低分 5 个回路（改善优先）+ 最高分 5 个（对标标杆） |
| 大屏模式 | 隐藏侧边栏、放大字体 |

### 模块二：监控（Monitoring）

| 功能 | 说明 |
|------|------|
| 实时监控 | 所有回路最新评估指标，支持层级筛选和排序 |
| 历史查询 | 按小时/天/月维度查询历史聚合快照，含可信度元数据 |

### 模块三：评估（Assessment）

| 功能 | 说明 |
|------|------|
| 评估矩阵 | 21 回路振荡率、粘滞系数、饱和率、调节时间、优良值率、投运率、性能评分 |
| 多维筛选 | 振荡率阈值、粘滞系数阈值、性能等级过滤 |
| 雷达图 | 8 维度雷达图（自控率、平稳率、优良值率、性能评分、振荡率、粘滞系数、饱和率、投运率） |
| 诊断建议 | 故障类型识别 + 中文优化建议（阀门粘滞、振荡、非线性、耦合） |
| 优先改善 | 低分回路排序，点击进入单回路详情 |

### 模块四：系统辨识（Identification）

闭环 ARX + 简化子空间法（MOESP）进行过程模型估计（增益、时间常数、死区时间），含激励检测。

### 模块五：PID 整定（Tuning）

| 方法 | 说明 |
|------|------|
| IMC | 内模控制整定 |
| IMC-Aggressive | 激进 IMC |
| Lambda | Lambda 直接合成法 |
| Interactive | 交互式特征点/趋势线法 |

整定结果含阶跃响应仿真对比（整定前 vs 整定后），支持可信度评分。

### 模块六：闭环仿真（Simulation）

独立仿真引擎，支持阶跃响应、扰动、粘滞等场景，可配置整定方法。

### 模块七：报告（Reports）

| 功能 | 说明 |
|------|------|
| 单回路报告 | PDF/HTML，含评估、诊断、整定建议 |
| 批量报告 | 按装置/回路组 + 周期批量生成 |

### 模块八：投运准备（Commissioning）

CSV 模板下载 → 回路元数据导入 → 配置校验 → 投运就绪状态。

### 模块九：调度与审计（Scheduler & Audit）

APScheduler 定时评估/报告作业管理，审计事件记录。

### 模块十：系统设置（Settings）

| 功能 | 说明 |
|------|------|
| 运行时数据源 | mock / tdengine / auto-demo 切换，含连通性校验 |
| 功能开关 | assessment, diagnosis, identification, tuning, simulation, reporting 按需启用 |
| 用户管理 | 本地用户 + 角色（admin/engineer/viewer） |

## 3. 数据模型

### 配置域（3 张核心表）

| 表 | 用途 |
|---|------|
| `plants` | 工厂/厂区 |
| `devices` | 装置/工段，关联 plant |
| `loop_groups` | 回路组，关联 device |
| `loop_tags` | PID 回路元数据（tag_name、unit、loop_type、loop_category、PV/SP/OP 标签、量程、采样间隔、死区时间、级联/前馈关系、平稳阈值等） |

### 运行时快照域（9 张表）

| 表 | 用途 |
|---|------|
| `assessment_snapshots` | 评估快照（窗口起止、评分、等级、指标 JSON） |
| `diagnosis_snapshots` | 诊断快照（主故障、置信度、详情 JSON） |
| `identification_snapshots` | 辨识快照（增益、tau、死区、R²、详情 JSON） |
| `tuning_snapshots` | 整定快照（方法、Kc/Ti/Td、置信度） |
| `dashboard_snapshots` | 驾驶舱聚合快照 |
| `monitoring_aggregate_snapshots` | 监控历史聚合（维度、桶标签、评分/自控率/平稳率均值、可信度） |
| `recommendation_snapshots` | 综合建议（关联评估+诊断+整定快照、风险等级、状态） |
| `recommendation_actions` | 建议执行动作记录 |
| `outcome_snapshots` | 效果评估（整定前后对比 delta JSON） |

### 运维域（10 张表）

| 表 | 用途 |
|---|------|
| `data_sources` | 数据源配置 |
| `loop_signal_bindings` | 回路信号绑定 |
| `system_settings` | 系统设置键值对 |
| `feature_flags` | 功能开关 |
| `feature_entitlements` | 客户授权 |
| `ingest_watermarks` | 数据摄取水位 |
| `report_jobs` | 报表作业 |
| `report_artifacts` | 报表制品 |
| `scheduler_jobs` | 调度作业 |
| `scheduler_runs` | 调度运行记录 |
| `audit_events` | 审计事件 |

### 用户域（1 张表）

| 表 | 用途 |
|---|------|
| `users` | 本地用户（username、password_hash、salt、role、display_name） |

## 4. API 接口

共 15 个路由模块，约 60+ 端点。

| 路由模块 | 前缀 | 端点举例 |
|---------|------|---------|
| auth | `/api/auth` | POST login, GET me, GET users |
| config | `/api/config/loops`, `/api/config/groups` | CRUD 回路标签和回路组 |
| plant | `/api/plants`, `/api/devices` | 工厂/装置 CRUD + 层级树 `/api/plants/tree` |
| loop | `/api/loop` | 驾驶舱数据、回路详情、历史趋势、激励检测、整定管道 |
| overview | `/api/overview` | GET summary（KPI、自控率、等级分布、Top/Bottom 回路） |
| monitoring | `/api/monitoring` | GET realtime（实时评估）、GET history（历史聚合） |
| assessment | `/api/assessment` | GET realtime（评估矩阵）、GET radar（雷达图）、GET suggestions（诊断建议） |
| commissioning | `/api/commissioning` | GET template, POST import, GET validate, GET readiness |
| identification | `/api/identification` | GET 辨识结果、GET 激励检测 |
| tuning | (内嵌于 loop 路由) | POST /api/loop/{tag}/tuning |
| simulation | `/api/simulation` | POST run, GET scenarios |
| reports | `/api/reports` | GET loop/{tag}, GET batch |
| features | `/api/features` | GET 列表, PUT 切换开关 |
| production | `/api/production` | 数据源管理、运行时源切换、快照查询、建议管理 |
| ops | `/api/ops` | 调度作业/运行、报表作业/制品查询和管理 |
| health | `/api/health*` | 基础健康、存活、就绪、依赖检查 |

## 5. 数据流

```
TDengine（原始时序数据 pv/sp/op/mode）
        │
        ├── 实时查询路径：runtime_provider → 各页面实时评估
        │
        └── 定时聚合刷新 → PostgreSQL aggregate snapshots
                │
                ├── /api/monitoring/history（历史监控）
                └── 驾驶舱/报告汇总

运行时数据源管理器（RuntimeSourceManager）
        │
        ├── 三种模式：mock / tdengine / auto-demo
        ├── 健康探针 + 自动降级
        └── Runtime Trust Contract（每页统一显示来源/新鲜度/完整度/置信度）
```

## 6. UI/UX 设计

### 设计理念

遵循"信任→问题→行动"三层信息架构：
- **Layer 1**：数据可信度（来源、新鲜度、完整度）
- **Layer 2**：当前问题（排序回路、异常高亮、诊断结论）
- **Layer 3**：下一步行动（进入详情、查看整定、核验证据）

### 色彩系统

| Token | 值 | 用途 |
|-------|----|------|
| `--bg` | `#0f1923` | 侧边栏暗色背景 |
| `--bg-soft` | `#e2e8f0` | 页面浅灰背景 |
| `--surface-soft` / `--panel` | `#ffffff` | 卡片/面板背景 |
| `--text-strong` | `#172033` | 正文标题 |
| `--text` | `#334155` | 正文内容 |
| `--text-muted` | `#344054` | 次要文字 |
| `--text-subtle` | `#475569` | 辅助说明 |
| `--text-dim` | `#64748b` | 表头标签 |
| `--accent` | `#14b8a6` | 强调色（青绿） |
| `--green` / `--blue` / `--yellow` / `--red` / `--gray` | 语义色 | 优/良/中/差/开环五级 |

### 字体

`"PingFang SC", "Microsoft YaHei", sans-serif`，字号梯度：12/14/18/32px（大屏模式 14/18/24/48px）。

### 布局

- 双栏：280px 暗色侧边栏 + 弹性主内容区
- 侧边栏：品牌区 → 导航分组（运行总览/优化执行/治理与配置）→ 装置回路树 → 用户信息
- 顶栏：页面元信息 + 运行时状态胶囊 + 元数据卡片
- 运行时栏：配置模式 / 当前生效 / 回路覆盖 / 状态说明四列
- 内容区：Flex/Grid 布局，18px 间距
- 响应式断点：960px（单栏）、1280px（窄侧边栏）
- 大屏模式：隐藏侧边栏、全屏字体

### 交互状态覆盖

| 状态 | 处理方式 |
|------|---------|
| 加载中 | 骨架占位 / "加载中..." |
| 空数据 | "暂无数据" / "暂无符合筛选条件的回路" |
| 错误 | 面板级降级 + 重试入口 |
| 部分数据 | 标注缺失 + 数据来源状态 |
| 过期数据 | 琥珀色过期标记 + 最后更新时间 |

## 7. 配置与部署

### 关键环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PDS_ENVIRONMENT` | `development` | 环境模式 |
| `PDS_DATABASE_URL` | `sqlite:///pds_config.db` | 配置数据库 |
| `PDS_RUNTIME_DATA_SOURCE` | `mock` | 运行时数据源 |
| `PDS_JWT_SECRET` | (开发默认值) | JWT 密钥（生产必须覆盖） |
| `PDS_BOOTSTRAP_ADMIN_USERNAME` / `PDS_BOOTSTRAP_ADMIN_PASSWORD` | (生产必须) | 初始管理员凭证 |

### 生产约束

- Python 3.9+ 兼容（`Optional[X]` 替代 `X | None`）
- 无 Celery/Redis：APScheduler 进程内调度
- 目标部署平台：国产 Linux + 海光 x86 硬件
- WeasyPrint 须在缺少原生库时安全降级
- Alembic 优先的数据库迁移流程

### Docker Compose 服务

```
postgres:16 → backend (FastAPI :8000) → frontend (nginx :80)
tdengine:3.3.6 ──────────┘
```

## 8. Mock 数据

21 个预置回路，覆盖 7 类工艺装置（甲醇、PSA 制氢、氨合成、低温甲醇洗、气化、冷冻站、硫回收制酸等），含已知特征：
- 阀门粘滞（5 个回路，stiction 1.2–2.0）
- 振荡（3 个回路，周期 90–150s）
- 良好回路（6 个，用于对标标杆）

数据生成采用 PI 控制器 + FOPDT 过程模型的闭环仿真，内部 1 秒步长，降采样至 60 秒间隔输出。

## 9. 测试

- **后端**：40 个 pytest 用例（API 烟雾测试、评估/诊断/整定引擎单元测试、迁移测试）
- **前端**：12 个 vitest 用例（App 路由、Layout 渲染、组件存在性）
- **覆盖率目标**：> 80%

---

*最后更新：2026-05-29*
