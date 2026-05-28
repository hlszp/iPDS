# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
PDS (PID Performance Assessment & Tuning System) — 化工装置 PID 控制回路性能评估与参数整定系统。
标准化软件产品，目标 3+ 化工企业客户。符合 GB/T 44693.2-2024 标准。

## Common Commands

| Task | Command |
|---|---|
| Create backend venv | `cd backend && python -m venv venv && source venv/bin/activate` |
| Install backend deps | `cd backend && source venv/bin/activate && pip install -r requirements.txt` |
| Run backend locally | `source backend/venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --reload` |
| Run backend tests | `cd backend && source venv/bin/activate && pytest` |
| Run a single backend test file | `cd backend && source venv/bin/activate && pytest tests/services/test_assessment_engine.py` |
| Run a single backend test case | `cd backend && source venv/bin/activate && pytest tests/api/test_smoke.py -k health` |
| Run backend tests with coverage | `cd backend && source venv/bin/activate && pytest --cov=app --cov-report=term-missing` |
| Run Alembic migrations manually | `cd backend && source venv/bin/activate && alembic upgrade head` |
| Install frontend deps | `cd frontend && npm install` |
| Run frontend locally | `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173` |
| Build frontend | `cd frontend && npm run build` |
| Run frontend tests once | `cd frontend && npm run test:run` |
| Run a single frontend test file | `cd frontend && npm run test:run -- src/api/client.test.jsx` |
| Start Docker stack | `docker compose up -d --build` |
| Stop Docker stack | `docker compose down` |
| Validate compose config | `PDS_JWT_SECRET=... PDS_BOOTSTRAP_ADMIN_USERNAME=... PDS_BOOTSTRAP_ADMIN_PASSWORD=... docker compose config` |

## Architecture
- The production target stack is **FastAPI + PostgreSQL + TDengine + React**.
- `backend/app/main.py` is the backend entrypoint. On startup it validates security defaults, runs Alembic `upgrade head` outside tests, then bootstraps seed data and TDengine runtime schema.
- PostgreSQL is the system-of-record for users, plant/device/loop hierarchy, feature entitlements, snapshots, recommendation/reporting artifacts, scheduler state, and audit events.
- TDengine stores runtime loop series (`pv/sp/op/mode`). Backend runtime reads are routed through `backend/app/data/runtime_provider.py`, which can serve TDengine data, pure mock data, or auto-fallback mock demo data when real data is unhealthy or incomplete.
- The main backend layering is: `routers/` for HTTP contracts, `services/` for assessment/diagnosis/tuning/report logic, `models/` for relational persistence, and `data/` for database/runtime providers.
- `backend/app/models/production.py` contains the productized persistence model added beyond the earlier demo schema: runtime source config, feature entitlements, assessment/diagnosis/identification/tuning snapshots, recommendation actions, monitoring aggregates, report jobs/artifacts, scheduler jobs/runs, and audit events.
- Frontend is a React/Vite SPA. `frontend/src/App.jsx` is the route shell; pages under `frontend/src/pages/` map directly to the main product surfaces such as overview, monitoring, assessment, tuning, reports, configuration, commissioning, and settings.
- Frontend API access is centralized in `frontend/src/api/client.js`. It injects the JWT from `localStorage`, treats `/api` as the backend base path, and clears session state on `401`.
- Health endpoints are intentionally split: `/api/health` for basic status, `/api/health/live`, `/api/health/ready`, and `/api/health/dependencies` for operational checks.

## Key Constraints
- Python must stay compatible with 3.9; prefer `Optional[...]` over `X | None`.
- No Celery or Redis: background and scheduled work should stay within APScheduler and in-process services.
- The deployment target includes domestic Linux distributions and Hygon x86 hardware.
- WeasyPrint must degrade safely when native libraries are missing.
- Production flow is Alembic-first. Prefer migrations over ad-hoc schema mutation or relying on `create_all`.

## Delivery Notes

| Item | Rule |
|---|---|
| JWT secret | Production must provide `PDS_JWT_SECRET` |
| Bootstrap admin | Production must provide `PDS_BOOTSTRAP_ADMIN_USERNAME` and `PDS_BOOTSTRAP_ADMIN_PASSWORD` |
| Runtime source | Production default should be `tdengine` |
| Config DB | Production default should be PostgreSQL |
| Migration flow | Use Alembic `upgrade head`, not ad-hoc schema mutation |

## Existing Repo Guidance To Preserve
- Use the available Claude skills when the task clearly matches them; this repo explicitly routes bugs/errors to `/investigate`, QA/site testing to `/qa` or `/qa-only`, architecture to `/plan-eng-review`, design review to `/plan-design-review` or `/design-review`, and shipping/deploy work to `/ship` or `/land-and-deploy`.
- `README.md` and the existing project guidance both treat this as a productized PID assessment platform with five core technical modules: assessment, diagnosis, identification, tuning, and simulation.
