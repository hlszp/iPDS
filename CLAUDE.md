# CLAUDE.md — PDS

## Project Overview
PDS (PID Performance Assessment & Tuning System) — 化工装置 PID 控制回路性能评估与参数整定系统。
标准化软件产品，目标 3+ 化工企业客户。符合 GB/T 44693.2-2024 标准。

## Tech Stack
- Backend: Python 3.9+ / FastAPI / SQLAlchemy / SQLite / APScheduler / PyJWT
- Frontend: React 18 / Vite / ECharts 5 / React Router 6
- Data: TDengine (time-series, existing pipeline) + SQLite (config)
- Deploy: Docker Compose, domestic Linux (Hygon x86 + 麒麟/统信)

## Quick Start
```bash
# Backend
source backend/venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend

# Frontend
cd frontend && npx vite --host 127.0.0.1 --port 5173
```
Login: admin / admin123
Swagger: http://127.0.0.1:8000/api/docs

## Key Architecture Decisions
- Mock data layer (backend/app/data/mock.py) with 21 preset loops, NOT connected to real TDengine
- Config stored in SQLite (pds_config.db), auto-created on startup
- No Celery/Redis — pure APScheduler for background tasks
- PDF reports use WeasyPrint with HTML fallback (domestic OS compat)
- All 5 core modules in MVP: assessment, diagnosis, identification, tuning, simulation
- Python 3.9 compat: use Optional[str] not `str | None`

## Project Structure
```
backend/app/
├── main.py              # FastAPI entry, lifespan, seed data
├── config/              # settings.py + features.py (feature flags)
├── models/              # loop.py, user.py, schemas.py, auth_schemas.py
├── data/                # database.py (SQLite), mock.py (21 preset loops)
├── auth/                # jwt.py, dependencies.py (get_current_user, require_role)
├── routers/             # config.py, auth.py, reports.py
└── services/
    ├── assessment/      # T5: KPI calc, grading, trend detection
    ├── diagnosis/       # T6: stiction, oscillation, nonlinearity, coupling
    ├── identification/  # T7: excitation check, ARX, subspace
    ├── tuning/          # T8: IMC, Lambda, interactive methods
    ├── simulation/      # T9: step response, frequency, confidence
    ├── reporting/       # T11: GB/T PDF reports
    └── commissioning/   # T13: CSV import, validation

frontend/src/
├── pages/Dashboard/     # Heatmap, Top10, TrendChart, KpiBar, EventTimeline
├── pages/LoopDetail/    # KPI cards, diagnosis, PV/SP/OP trend
├── pages/TuningWorkspace/ # IMC/Lambda/Aggressive tuning + simulation
├── pages/Config/        # Loop tag CRUD table
└── pages/Login/         # JWT login form
```

## Current State (2026-05-23)
- All 14 functional tasks complete (T1-T14), 7 commits pushed
- Reviews: CEO CLEAN + Eng CLEAN + Design CLEAN
- Git: main branch, remote https://github.com/hlszp/iPDS
- Remaining: tests (>80% coverage), API versioning, Alembic migrations, real TDengine connection

## Design Tokens (Dark Theme)
--bg: #0f1923, --surface: #182533, --border: #253545
--text: #d0d8e0, --text-dim: #708090, --accent: #f0a030
--green: #2ecc71, --blue: #3498db, --yellow: #f1c40f, --red: #e74c3c
Font: PingFang SC / Microsoft YaHei

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
