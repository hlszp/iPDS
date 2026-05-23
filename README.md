# PDS — PID Performance Assessment & Tuning System

化工装置 PID 控制回路性能评估与参数整定系统。

## 项目定位

标准化软件产品——面向危化品企业的控制回路性能评估与 PID 参数整定平台。覆盖 1200+ 控制回路，支持 GB/T 44693.2-2024 合规要求。

## 技术栈

- **后端**: Python 3.x / FastAPI / TDengine / APScheduler
- **前端**: React 18 / ECharts
- **部署**: Docker Compose / 国产服务器（海光x86 + 国产OS）

## 项目结构

```
PDS/
├── backend/           # FastAPI 应用
│   └── app/
│       ├── services/  # 业务模块（评估/诊断/辨识/整定/仿真）
│       ├── routers/   # API 路由
│       ├── models/    # 数据模型
│       └── config/    # 配置管理
├── frontend/          # React + ECharts
├── deploy/            # Docker + 部署脚本
├── PLAN.md            # 实施计划
└── designs/           # 设计资产（见 ~/.gstack/projects/pds/designs/）
```

## 开发环境

```bash
# 后端
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend && npm install && npm run dev
```

## 审查状态

| 审查 | 状态 |
|------|------|
| CEO Review | CLEAN (SELECTIVE EXPANSION) |
| Eng Review | CLEAN |
| Design Review | CLEAN |

详见 PLAN.md
