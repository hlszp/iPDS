# PDS — PID Performance Assessment & Tuning System

化工装置 PID 控制回路性能评估与参数整定系统。

## 项目定位

标准化软件产品——面向危化品企业的控制回路性能评估与 PID 参数整定平台。覆盖 1200+ 控制回路，支持 GB/T 44693.2-2024 合规要求。

## 当前生产架构

| 层 | 组件 | 职责 |
|---|---|---|
| 前端 | React 18 + Nginx | Web 工作台与报表入口 |
| 业务后端 | FastAPI | 配置、评估、诊断、整定、报表、调度、审计 |
| 关系库 | PostgreSQL | 用户、主数据、快照、作业、审计、授权 |
| 时序库 | TDengine | 回路 PV/SP/OP/MODE 原始时序数据 |

## 技术栈

- **后端**: Python 3.x / FastAPI / PostgreSQL / TDengine / APScheduler
- **前端**: React 18 / ECharts
- **部署**: Docker Compose / 国产服务器（海光 x86 + 国产 OS）

## 项目结构

```bash
PDS/
├── backend/           # FastAPI 应用
│   ├── alembic/       # 数据库迁移
│   └── app/
│       ├── services/  # 业务模块（评估/诊断/辨识/整定/仿真）
│       ├── routers/   # API 路由
│       ├── models/    # PostgreSQL 领域模型
│       ├── data/      # 运行时数据 provider / TDengine 仓储
│       └── config/    # 配置管理
├── frontend/          # React + ECharts
├── deploy/            # 部署脚本与交付材料
├── PLAN.md            # 路线文档
└── README.md
```

## 本地开发

```bash
# 后端
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend && npm install && npm run dev
```

## 生产部署

### 必填环境变量

| 变量 | 说明 |
|---|---|
| `PDS_JWT_SECRET` | JWT 密钥，生产必须显式设置 |
| `PDS_BOOTSTRAP_ADMIN_USERNAME` | 首次管理员账号 |
| `PDS_BOOTSTRAP_ADMIN_PASSWORD` | 首次管理员密码 |
| `PDS_DATABASE_URL` | PostgreSQL 连接串 |
| `PDS_RUNTIME_DATA_SOURCE` | 建议为 `tdengine` |
| `PDS_TDENGINE_HOST` | TDengine 主机名 |
| `PDS_TDENGINE_PORT` | TDengine 端口 |
| `PDS_TDENGINE_USER` | TDengine 用户 |
| `PDS_TDENGINE_PASSWORD` | TDengine 密码 |
| `PDS_TDENGINE_DATABASE` | TDengine 数据库名 |

### Compose 启动

```bash
PDS_JWT_SECRET='replace-with-strong-secret' \
PDS_BOOTSTRAP_ADMIN_USERNAME='admin' \
PDS_BOOTSTRAP_ADMIN_PASSWORD='replace-with-strong-password' \
docker compose up -d --build
```

### 服务检查

| 地址 | 用途 |
|---|---|
| `http://127.0.0.1/api/health` | 基础健康检查 |
| `http://127.0.0.1/api/health/live` | liveness |
| `http://127.0.0.1/api/health/ready` | readiness |
| `http://127.0.0.1/api/health/dependencies` | PostgreSQL / TDengine 依赖状态 |
| `http://127.0.0.1/api/docs` | Swagger |

## 备份与恢复

### PostgreSQL

| 操作 | 命令 |
|---|---|
| 导出 | `docker exec <postgres-container> pg_dump -U pds pds > pds_pg.sql` |
| 恢复 | `cat pds_pg.sql | docker exec -i <postgres-container> psql -U pds -d pds` |

### TDengine

| 操作 | 说明 |
|---|---|
| 运行时数据保留 | 使用 `tdengine_data` volume |
| 容器级备份 | 备份 `tdengine_data` 和 `tdengine_logs` volumes |

## 升级流程

| 步骤 | 动作 |
|---|---|
| 1 | 备份 PostgreSQL 与 TDengine volumes |
| 2 | 拉取新代码 / 新镜像 |
| 3 | 执行 `docker compose up -d --build` |
| 4 | 后端启动时自动执行 Alembic `upgrade head` |
| 5 | 检查 `/api/health/ready` 和关键业务页面 |

## 离线交付建议

| 材料 | 内容 |
|---|---|
| 镜像包 | `postgres`, `tdengine`, `backend`, `frontend` 镜像 tar 包 |
| 配置样例 | `.env` 生产样例 |
| 迁移说明 | Alembic 升级与回滚说明 |
| 备份说明 | PostgreSQL dump 与 volume 备份恢复步骤 |
| 验收清单 | 健康检查、登录、报表、建议、调度、审计 |

## 审查状态

| 审查 | 状态 |
|------|------|
| CEO Review | CLEAN (SELECTIVE EXPANSION) |
| Eng Review | CLEAN |
| Design Review | CLEAN |

详见 PLAN.md
