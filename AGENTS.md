# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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
| Run backend tests with coverage | `cd backend && source venv/bin/activate && pytest --cov=app --cov-report=term-missing` |
| Start Docker stack | `docker compose up -d --build` |
| Stop Docker stack | `docker compose down` |
| Validate compose config | `PDS_JWT_SECRET=... PDS_BOOTSTRAP_ADMIN_USERNAME=... PDS_BOOTSTRAP_ADMIN_PASSWORD=... docker compose config` |

## Architecture
- The production target stack is now **FastAPI + PostgreSQL + TDengine + React**.
- PostgreSQL stores users, plant/device/loop hierarchy, feature entitlements, snapshots, report jobs/artifacts, scheduler jobs/runs, and audit events.
- TDengine stores runtime loop series (`pv/sp/op/mode`) and loop runtime tables are initialized at backend bootstrap when `PDS_RUNTIME_DATA_SOURCE=tdengine`.
- Backend runtime data access goes through `backend/app/data/runtime_provider.py`; TDengine provider may fall back to mock during development.
- Startup is now **Alembic-first** through `backend/app/migrations.py` and `backend/alembic/`; `create_all` is no longer the primary production path.
- Reporting, recommendation, and scheduler persistence now live in `backend/app/models/production.py` and are queried through `/api/production/*` and `/api/ops/*`.
- Health endpoints are split into `/api/health`, `/api/health/live`, `/api/health/ready`, and `/api/health/dependencies`.

## Key Constraints
- Python must stay compatible with 3.9; prefer `Optional[...]` over `X | None`.
- No Celery or Redis: background/scheduled work is expected to stay within APScheduler and in-process services.
- The deployment target includes domestic Linux distributions and Hygon x86 hardware.
- WeasyPrint must degrade safely when native libraries are missing.

## Delivery Notes

| Item | Rule |
|---|---|
| JWT secret | Production must provide `PDS_JWT_SECRET` |
| Bootstrap admin | Production must provide `PDS_BOOTSTRAP_ADMIN_USERNAME` and `PDS_BOOTSTRAP_ADMIN_PASSWORD` |
| Runtime source | Production default should be `tdengine` |
| Config DB | Production default should be PostgreSQL |
| Migration flow | Use Alembic `upgrade head`, not ad-hoc schema mutation |

## Existing Repo Guidance To Preserve
- Use the available Codex skills when the task clearly matches them; this repo explicitly routes bugs/errors to `/investigate`, QA/site testing to `/qa` or `/qa-only`, architecture to `/plan-eng-review`, design review to `/plan-design-review` or `/design-review`, and shipping/deploy work to `/ship` or `/land-and-deploy`.
- `README.md` and the existing project guidance both treat this as a productized PID assessment platform with five core technical modules: assessment, diagnosis, identification, tuning, and simulation.
