"""TDengine schema initialization helpers."""

from .config.settings import settings
from .data.tdengine_repository import TdengineRuntimeRepository
from .data.mock import PRESET_LOOPS


def init_tdengine_runtime_schema() -> None:
    repo = TdengineRuntimeRepository()
    conn = repo.connect()
    try:
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.tdengine_database}")
        cursor.execute(f"USE {settings.tdengine_database}")
        cursor.execute(
            """
            CREATE STABLE IF NOT EXISTS loop_runtime (
                ts TIMESTAMP,
                pv DOUBLE,
                sp DOUBLE,
                op DOUBLE,
                mode TINYINT
            ) TAGS (
                tag_name BINARY(64),
                unit BINARY(32),
                loop_type BINARY(16),
                sample_interval INT
            )
            """
        )
        for config in PRESET_LOOPS:
            table_name = f"loop_{config.tag_name.lower().replace('-', '_')}"
            cursor.execute(
                f"CREATE TABLE IF NOT EXISTS {table_name} USING loop_runtime TAGS ('{config.tag_name}', '{config.unit}', '{config.loop_type}', {config.sample_interval})"
            )
    finally:
        conn.close()
