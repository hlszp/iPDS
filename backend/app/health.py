"""Health and readiness helpers."""

from .data.database import engine
from .data.runtime_provider import get_runtime_source_manager


def get_dependency_health() -> dict:
    db_status = _check_database()
    runtime_snapshot = get_runtime_source_manager().get_status_snapshot()
    return {
        "database": db_status,
        "runtime_provider": runtime_snapshot.__dict__,
    }


def get_liveness() -> dict:
    runtime_snapshot = get_runtime_source_manager().get_status_snapshot()
    return {
        "status": "ok",
        "configured_runtime_source": runtime_snapshot.configured_source,
        "effective_runtime_source": runtime_snapshot.effective_source,
    }


def get_readiness() -> dict:
    deps = get_dependency_health()
    ready = deps["database"]["healthy"] and deps["runtime_provider"]["healthy"]
    return {
        "status": "ready" if ready else "degraded",
        "dependencies": deps,
    }


def _check_database() -> dict:
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return {"healthy": True, "detail": "database connection ok"}
    except Exception as exc:
        return {"healthy": False, "detail": str(exc)}
