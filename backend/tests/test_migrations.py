from pathlib import Path
import sys

from sqlalchemy import create_engine, inspect, text

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config.settings import settings
from app.migrations import run_migrations


LEGACY_TABLE_SQL = {
    "users": """
        CREATE TABLE users (
            username VARCHAR(64) PRIMARY KEY,
            password_hash VARCHAR(128) NOT NULL,
            salt VARCHAR(64) NOT NULL,
            role VARCHAR(16) NOT NULL,
            display_name VARCHAR(64),
            created_at DATETIME
        )
    """,
    "plants": """
        CREATE TABLE plants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(64) NOT NULL,
            description VARCHAR(256),
            created_at DATETIME
        )
    """,
    "devices": """
        CREATE TABLE devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant_id INTEGER NOT NULL,
            name VARCHAR(64) NOT NULL,
            description VARCHAR(256),
            monitoring_enabled BOOLEAN,
            created_at DATETIME
        )
    """,
    "loop_groups": """
        CREATE TABLE loop_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(64) NOT NULL,
            unit VARCHAR(32) NOT NULL,
            device_id INTEGER,
            description VARCHAR(256),
            weight INTEGER,
            created_at DATETIME
        )
    """,
    "loop_tags": """
        CREATE TABLE loop_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_name VARCHAR(64) NOT NULL,
            unit VARCHAR(32) NOT NULL,
            sub_unit VARCHAR(32),
            loop_type VARCHAR(16) NOT NULL,
            loop_category VARCHAR(8),
            loop_weight INTEGER,
            loop_group_id INTEGER,
            device_id INTEGER,
            description VARCHAR(256),
            pv_tag VARCHAR(64) NOT NULL,
            sp_tag VARCHAR(64) NOT NULL,
            op_tag VARCHAR(64) NOT NULL,
            mode_tag VARCHAR(64),
            eng_unit VARCHAR(16),
            pv_lo FLOAT,
            pv_hi FLOAT,
            op_lo FLOAT,
            op_hi FLOAT,
            sample_interval INTEGER,
            dead_time_typical FLOAT,
            cascade_parent VARCHAR(64),
            feedforward_tags TEXT,
            stability_threshold FLOAT,
            created_at DATETIME,
            updated_at DATETIME
        )
    """,
    "feature_flags": """
        CREATE TABLE feature_flags (
            key VARCHAR(64) PRIMARY KEY,
            enabled BOOLEAN NOT NULL
        )
    """,
}


def test_run_migrations_stamps_legacy_sqlite_db(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_path}")
    try:
        with engine.begin() as conn:
            for ddl in LEGACY_TABLE_SQL.values():
                conn.execute(text(ddl))
    finally:
        engine.dispose()

    monkeypatch.setattr(settings, "database_url", f"sqlite:///{db_path}")

    run_migrations(str(ROOT / "alembic.ini"))

    verify_engine = create_engine(f"sqlite:///{db_path}")
    try:
        inspector = inspect(verify_engine)
        tables = set(inspector.get_table_names())
        assert "system_settings" in tables
        assert "report_jobs" in tables
        with verify_engine.connect() as conn:
            version = conn.execute(text("select version_num from alembic_version")).scalar_one()
        assert version == "0001_baseline"
    finally:
        verify_engine.dispose()
