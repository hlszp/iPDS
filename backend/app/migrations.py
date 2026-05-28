"""Migration helpers for startup flow."""

from pathlib import Path
from typing import Iterable, Set

from alembic.command import stamp, upgrade
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from .config.settings import settings
from .models.loop import Base as LoopBase
from .models.user import Base as UserBase
from .models import production  # noqa: F401

_BASELINE_TABLES = {
    "users",
    "plants",
    "devices",
    "loop_groups",
    "loop_tags",
    "feature_flags",
    "data_sources",
    "loop_signal_bindings",
    "system_settings",
    "feature_entitlements",
    "ingest_watermarks",
    "assessment_snapshots",
    "diagnosis_snapshots",
    "identification_snapshots",
    "tuning_snapshots",
    "dashboard_snapshots",
    "monitoring_aggregate_snapshots",
    "recommendation_snapshots",
    "recommendation_actions",
    "outcome_snapshots",
    "report_jobs",
    "report_artifacts",
    "scheduler_jobs",
    "scheduler_runs",
    "audit_events",
}

_LEGACY_TABLES = {
    "users",
    "plants",
    "devices",
    "loop_groups",
    "loop_tags",
    "feature_flags",
}


_APP_DIR = Path(__file__).resolve().parent.parent  # backend/


def _build_config(config_path: str) -> Config:
    resolved = (_APP_DIR / config_path).resolve()
    cfg = Config(str(resolved))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    cfg.set_main_option("script_location", str(_APP_DIR / "alembic"))
    return cfg


def _connect_args():
    return {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}


def _existing_tables() -> Set[str]:
    engine = create_engine(settings.database_url, connect_args=_connect_args())
    try:
        return set(inspect(engine).get_table_names())
    finally:
        engine.dispose()


def _has_alembic_revision() -> bool:
    engine = create_engine(settings.database_url, connect_args=_connect_args())
    try:
        inspector = inspect(engine)
        if "alembic_version" not in inspector.get_table_names():
            return False
        with engine.connect() as conn:
            row = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
        return bool(row)
    finally:
        engine.dispose()


def _is_legacy_sqlite(table_names: Iterable[str]) -> bool:
    names = set(table_names)
    if not settings.database_url.startswith("sqlite"):
        return False
    if not names or not _LEGACY_TABLES.issubset(names):
        return False
    return not _BASELINE_TABLES.issubset(names)


def _backfill_baseline_tables() -> None:
    engine = create_engine(settings.database_url, connect_args=_connect_args())
    try:
        UserBase.metadata.create_all(bind=engine, checkfirst=True)
        LoopBase.metadata.create_all(bind=engine, checkfirst=True)
    finally:
        engine.dispose()


def run_migrations(config_path: str = "alembic.ini") -> None:
    cfg = _build_config(config_path)
    table_names = _existing_tables()
    if _is_legacy_sqlite(table_names):
        _backfill_baseline_tables()
        if not _has_alembic_revision():
            stamp(cfg, "0001_baseline")
        return
    upgrade(cfg, "head")
