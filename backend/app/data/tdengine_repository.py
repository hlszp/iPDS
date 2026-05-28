"""TDengine runtime repository helpers."""

from datetime import datetime, timedelta
from typing import Optional

from ..config.settings import settings
from .mock import LoopConfig, LoopData

MODE_MAP = {0: "MAN", 1: "AUTO", 2: "CASCADE"}


def _load_taos_module():
    try:
        import taos  # type: ignore
        return taos
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(f"TDengine client unavailable: {exc}")


class TdengineRuntimeRepository:
    def connect(self):
        taos = _load_taos_module()
        return taos.connect(
            host=settings.tdengine_host,
            port=settings.tdengine_port,
            user=settings.tdengine_user,
            password=settings.tdengine_password,
            database=settings.tdengine_database,
        )

    def ping(self) -> None:
        conn = self.connect()
        try:
            cursor = conn.cursor()
            cursor.execute("select server_version()")
            cursor.fetchall()
        finally:
            conn.close()

    def fetch_loop_window(self, config: LoopConfig, hours: float = 24) -> Optional[LoopData]:
        conn = self.connect()
        table_name = f"loop_{config.tag_name.lower().replace('-', '_')}"
        window_start = datetime.utcnow() - timedelta(hours=hours)
        sql = (
            f"SELECT ts, pv, sp, op, mode FROM {table_name} "
            f"WHERE ts >= '{window_start.strftime('%Y-%m-%d %H:%M:%S')}' ORDER BY ts"
        )
        try:
            cursor = conn.cursor()
            cursor.execute(sql)
            rows = cursor.fetchall()
        finally:
            conn.close()

        if not rows:
            return None

        timestamps = []
        pv = []
        sp = []
        op = []
        mode = []
        for ts, pv_val, sp_val, op_val, mode_val in rows:
            timestamps.append(ts)
            pv.append(float(pv_val))
            sp.append(float(sp_val))
            op.append(float(op_val))
            if isinstance(mode_val, str):
                mode.append(mode_val)
            else:
                mode.append(MODE_MAP.get(int(mode_val), "AUTO"))

        return LoopData(
            config=config,
            timestamps=timestamps,
            pv=pv,
            sp=sp,
            op=op,
            mode=mode,
        )
