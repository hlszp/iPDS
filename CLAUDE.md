# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
PDS (PID Performance Assessment & Tuning System) — 化工装置 PID 控制回路性能评估与参数整定系统。
标准化软件产品，目标 3+ 化工企业客户。符合 GB/T 44693.2-2024 标准。

## Common Commands

| Task | Command |
|------|---------|
| Create backend venv | `cd backend && python -m venv venv && source venv/bin/activate` |
| Install backend deps | `cd backend && source venv/bin/activate && pip install -r requirements.txt` |
| Run backend locally | `source backend/venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload` |
| Install frontend deps | `cd frontend && npm install` |
| Run frontend locally | `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173` |
| Build frontend | `cd frontend && npm run build` |
| Preview frontend build | `cd frontend && npm run preview -- --host 127.0.0.1 --port 5173` |
| Run backend tests | `cd backend && source venv/bin/activate && pytest` |
| Run a single backend test file | `cd backend && source venv/bin/activate && pytest path/to/test_file.py` |
| Run a single backend test | `cd backend && source venv/bin/activate && pytest path/to/test_file.py -k test_name` |
| Run backend tests with coverage | `cd backend && source venv/bin/activate && pytest --cov=app --cov-report=term-missing` |
| Start Docker stack | `docker compose up -d` |
| Rebuild Docker stack | `docker compose up -d --build` |
| Stop Docker stack | `docker compose down` |

Login: `admin / admin123`  
Swagger: `http://127.0.0.1:8000/api/docs`

## Architecture
- The backend is a single FastAPI app rooted at `backend/app/main.py` that creates SQLite tables at startup, seeds the default admin user, seeds feature flags, and loads preset loop metadata from the mock dataset.
- The current product is still mock-data-first: runtime loop behavior comes from `backend/app/data/mock.py`, while editable configuration and feature flags persist in SQLite via SQLAlchemy models in `backend/app/models/` and `backend/app/config/features.py`.
- Backend APIs are split by responsibility: `routers/auth.py` handles JWT login, `routers/config.py` manages loop tag CRUD, `routers/loop.py` exposes dashboard/detail/tuning workflows, `routers/commissioning.py` handles CSV import and validation, `routers/reports.py` generates reports, and `routers/features.py` exposes module toggles.
- Domain logic lives in `backend/app/services/*/engine.py`. The five analysis modules (assessment, diagnosis, identification, tuning, simulation) are intentionally separate from API wiring so the frontend and report generation both consume the same service layer.
- Reporting and commissioning are first-class backend capabilities, not add-ons: reports are generated server-side with WeasyPrint plus HTML fallback, and commissioning imports/validates loop data from CSV before it enters the config dataset.
- Feature gating is deployment-level, not user-role-level. `backend/app/config/features.py` keeps an in-memory snapshot loaded from the config database, and the frontend uses `/api/features` to decide which modules to surface for a specific customer deployment.
- The frontend is a React 18 SPA rooted at `frontend/src/App.jsx`. Authentication is client-side: the JWT token and user payload are stored in `localStorage`, and unauthenticated users are routed directly to the login screen.
- `frontend/src/api/client.js` is the single API boundary for the UI. It centralizes bearer-token injection, 401 handling, JSON requests, and file download requests, so new pages should extend this client instead of calling `fetch` directly.
- Route structure mirrors product modules: dashboard is the landing page, loop detail drills into one tag, tuning has both selector and workspace flows, and config/reports/commissioning/settings are standalone operational screens under the shared layout.
- There is no real TDengine integration yet despite the target architecture. Current code assumes mock time-series data plus SQLite config; remaining roadmap items called out in project docs are tests, API versioning, Alembic migrations, and a real TDengine connection.

## Key Constraints
- Python must stay compatible with 3.9; prefer `Optional[...]` over `X | None`.
- No Celery or Redis: background/scheduled work is expected to stay within APScheduler and in-process services.
- The deployment target includes domestic Linux distributions and Hygon x86 hardware, which is why report generation includes a non-PDF HTML fallback path.
- There are currently no committed backend or frontend test files, even though `pytest`, `pytest-cov`, and `pytest-asyncio` are already in `backend/requirements.txt`.

## Existing Repo Guidance To Preserve
- Use the available Claude skills when the task clearly matches them; this repo explicitly routes bugs/errors to `/investigate`, QA/site testing to `/qa` or `/qa-only`, architecture to `/plan-eng-review`, design review to `/plan-design-review` or `/design-review`, and shipping/deploy work to `/ship` or `/land-and-deploy`.
- `README.md` and the existing project guidance both treat this as a productized PID assessment platform with five core technical modules: assessment, diagnosis, identification, tuning, and simulation.
