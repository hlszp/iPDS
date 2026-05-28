"""Runtime data provider selection and default implementations."""

from dataclasses import dataclass
from datetime import datetime
import threading
from typing import List, Optional

from sqlalchemy.orm import Session

from ..config.settings import settings
from ..models.loop import LoopTag
from ..models.production import SystemSetting
from . import loop_cache
from .database import SessionLocal
from .mock import LoopConfig, PRESET_LOOPS
from .providers import RuntimeDataProvider, RuntimeLoopData, RuntimeProviderStatus
from .tdengine_repository import TdengineRuntimeRepository

RUNTIME_SOURCE_KEY = "runtime_data_source_mode"
RUNTIME_SOURCE_MOCK = "mock"
RUNTIME_SOURCE_REAL = "real"
RUNTIME_SOURCE_AUTO_DEMO = "auto-demo"
VALID_RUNTIME_SOURCES = {RUNTIME_SOURCE_MOCK, RUNTIME_SOURCE_REAL, RUNTIME_SOURCE_AUTO_DEMO}
_runtime_lock = threading.Lock()


@dataclass
class RuntimeSourceSnapshot:
    configured_source: str
    effective_source: str
    healthy: bool
    degraded: bool
    fallback_reason: Optional[str]
    expected_loop_count: int
    served_loop_count: int
    missing_tags: list[str]
    detail: str
    checked_at: datetime


@dataclass
class RuntimeQueryResult:
    loops: List[RuntimeLoopData]
    snapshot: RuntimeSourceSnapshot


def _tdengine_client_available() -> bool:
    try:
        import taos  # type: ignore  # noqa: F401
        return True
    except Exception:
        return False


class MockRuntimeProvider(RuntimeDataProvider):
    def get_loop_data(self, tag_name: str, hours: float = 24, seed: int = 42) -> Optional[RuntimeLoopData]:
        data = loop_cache.get_loop_data(tag_name, hours=hours, seed=seed)
        if data is None:
            return None
        return RuntimeLoopData(
            config=data.config,
            timestamps=data.timestamps,
            pv=data.pv,
            sp=data.sp,
            op=data.op,
            mode=data.mode,
            source="mock",
            generated_at=datetime.utcnow(),
        )

    def get_all_loop_data(self, hours: float = 24, seed: int = 42) -> List[RuntimeLoopData]:
        items = []
        for config in self._list_runtime_configs():
            item = self.get_loop_data(config.tag_name, hours=hours, seed=seed)
            if item is not None:
                items.append(item)
        return items

    def get_status(self) -> RuntimeProviderStatus:
        return RuntimeProviderStatus(
            source="mock",
            healthy=True,
            freshness_seconds=0.0,
            detail="using synthetic runtime data",
        )

    def _list_runtime_configs(self) -> List[LoopConfig]:
        db = SessionLocal()
        try:
            return list_runtime_configs(db)
        finally:
            db.close()


class TdengineRuntimeProvider(RuntimeDataProvider):
    def __init__(self):
        self.repository = TdengineRuntimeRepository()
        self.fallback = MockRuntimeProvider()

    def get_loop_data(self, tag_name: str, hours: float = 24, seed: int = 42) -> Optional[RuntimeLoopData]:
        config = self._get_runtime_config(tag_name)
        if config is None:
            return None
        if not self._can_query_tdengine():
            return None
        try:
            data = self.repository.fetch_loop_window(config, hours=hours)
        except Exception:
            return None
        if data is None:
            return None
        return RuntimeLoopData(
            config=data.config,
            timestamps=data.timestamps,
            pv=data.pv,
            sp=data.sp,
            op=data.op,
            mode=data.mode,
            source="tdengine",
            generated_at=datetime.utcnow(),
        )

    def get_all_loop_data(self, hours: float = 24, seed: int = 42) -> List[RuntimeLoopData]:
        configs = self.fallback._list_runtime_configs()
        if not self._can_query_tdengine():
            return []
        items = []
        for config in configs:
            try:
                data = self.repository.fetch_loop_window(config, hours=hours)
            except Exception:
                return []
            if data is None:
                continue
            items.append(RuntimeLoopData(
                config=data.config,
                timestamps=data.timestamps,
                pv=data.pv,
                sp=data.sp,
                op=data.op,
                mode=data.mode,
                source="tdengine",
                generated_at=datetime.utcnow(),
            ))
        return items

    def get_status(self) -> RuntimeProviderStatus:
        if not _tdengine_client_available():
            return RuntimeProviderStatus(
                source="tdengine",
                healthy=False,
                freshness_seconds=None,
                detail="taospy client library unavailable",
            )
        try:
            self.repository.ping()
            return RuntimeProviderStatus(
                source="tdengine",
                healthy=True,
                freshness_seconds=None,
                detail="tdengine connection ok",
            )
        except Exception as exc:
            return RuntimeProviderStatus(
                source="tdengine",
                healthy=False,
                freshness_seconds=None,
                detail=f"tdengine connection failed: {exc}",
            )

    def _get_runtime_config(self, tag_name: str) -> Optional[LoopConfig]:
        for config in self.fallback._list_runtime_configs():
            if config.tag_name == tag_name:
                return config
        return None

    def _can_query_tdengine(self) -> bool:
        if not _tdengine_client_available():
            return False
        try:
            self.repository.ping()
            return True
        except Exception:
            return False


class RuntimeSourceManager:
    def __init__(self):
        self.mock_provider = MockRuntimeProvider()
        self.real_provider = TdengineRuntimeProvider()

    def get_mode(self, db: Optional[Session] = None) -> str:
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key == RUNTIME_SOURCE_KEY).first()
            if row and row.value in VALID_RUNTIME_SOURCES:
                return row.value
            return self._default_mode()
        finally:
            if close_db:
                db.close()

    def set_mode(self, source: str, db: Optional[Session] = None) -> str:
        if source not in VALID_RUNTIME_SOURCES:
            raise ValueError(f"unsupported runtime source: {source}")
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key == RUNTIME_SOURCE_KEY).first()
            if row is None:
                row = SystemSetting(key=RUNTIME_SOURCE_KEY, value=source, scope="system")
                db.add(row)
            else:
                row.value = source
            db.flush()
            if close_db:
                db.commit()
            return source
        finally:
            if close_db:
                db.close()

    def get_status_snapshot(self, db: Optional[Session] = None, hours: float = 1, seed: int = 42) -> RuntimeSourceSnapshot:
        return self.resolve_loop_data(db=db, hours=hours, seed=seed).snapshot

    def resolve_loop_data(self, db: Optional[Session] = None, hours: float = 1, seed: int = 42) -> RuntimeQueryResult:
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True
        try:
            expected_configs = list_runtime_configs(db)
            expected_tags = [config.tag_name for config in expected_configs]
            configured_source = self.get_mode(db)
            if configured_source == RUNTIME_SOURCE_MOCK:
                loops = self.mock_provider.get_all_loop_data(hours=hours, seed=seed)
                snapshot = self._build_snapshot(configured_source, "mock", loops, expected_tags, healthy=True, degraded=False, fallback_reason=None, detail="using mock demo data")
                return RuntimeQueryResult(loops=loops, snapshot=snapshot)

            real_loops = self.real_provider.get_all_loop_data(hours=hours, seed=seed)
            real_status = self.real_provider.get_status()
            real_served_tags = [item.config.tag_name for item in real_loops]
            real_missing_tags = [tag for tag in expected_tags if tag not in set(real_served_tags)]
            real_complete = bool(expected_tags) and not real_missing_tags

            if configured_source == RUNTIME_SOURCE_REAL:
                return RuntimeQueryResult(
                    loops=real_loops,
                    snapshot=self._build_snapshot(
                        configured_source,
                        "tdengine",
                        real_loops,
                        expected_tags,
                        healthy=real_status.healthy and real_complete,
                        degraded=not (real_status.healthy and real_complete),
                        fallback_reason=None,
                        detail=real_status.detail if real_status.healthy else real_status.detail,
                    ),
                )

            if real_status.healthy and real_complete:
                return RuntimeQueryResult(
                    loops=real_loops,
                    snapshot=self._build_snapshot(
                        configured_source,
                        "tdengine",
                        real_loops,
                        expected_tags,
                        healthy=True,
                        degraded=False,
                        fallback_reason=None,
                        detail="using real TDengine data",
                    ),
                )

            fallback_reason = real_status.detail if not real_status.healthy else "real data incomplete"
            loops = self.mock_provider.get_all_loop_data(hours=hours, seed=seed)
            return RuntimeQueryResult(
                loops=loops,
                snapshot=self._build_snapshot(
                    configured_source,
                    "mock",
                    loops,
                    expected_tags,
                    healthy=True,
                    degraded=True,
                    fallback_reason=fallback_reason,
                    detail="using mock demo fallback",
                ),
            )
        finally:
            if close_db:
                db.close()

    def _default_mode(self) -> str:
        if settings.runtime_data_source == "tdengine":
            return RUNTIME_SOURCE_AUTO_DEMO
        return RUNTIME_SOURCE_MOCK

    def _build_snapshot(
        self,
        configured_source: str,
        effective_source: str,
        loops: List[RuntimeLoopData],
        expected_tags: list[str],
        healthy: bool,
        degraded: bool,
        fallback_reason: Optional[str],
        detail: str,
    ) -> RuntimeSourceSnapshot:
        served_tags = [item.config.tag_name for item in loops]
        served_set = set(served_tags)
        missing_tags = [tag for tag in expected_tags if tag not in served_set]
        return RuntimeSourceSnapshot(
            configured_source=configured_source,
            effective_source=effective_source,
            healthy=healthy,
            degraded=degraded,
            fallback_reason=fallback_reason,
            expected_loop_count=len(expected_tags),
            served_loop_count=len(served_tags),
            missing_tags=missing_tags[:20],
            detail=detail,
            checked_at=datetime.utcnow(),
        )


def list_runtime_configs(db: Session) -> List[LoopConfig]:
    rows = db.query(LoopTag).order_by(LoopTag.tag_name.asc()).all()
    if not rows:
        return PRESET_LOOPS
    preset_map = {item.tag_name: item for item in PRESET_LOOPS}
    configs = []
    for row in rows:
        preset = preset_map.get(row.tag_name)
        configs.append(
            LoopConfig(
                tag_name=row.tag_name,
                unit=row.unit,
                loop_type=row.loop_type,
                description=row.description or "",
                gain=preset.gain if preset else 1.0,
                tau=preset.tau if preset else 10.0,
                dead_time=row.dead_time_typical if row.dead_time_typical is not None else (preset.dead_time if preset else 2.0),
                noise_std=preset.noise_std if preset else 0.02,
                stiction=preset.stiction if preset else 0.0,
                oscillation_period=preset.oscillation_period if preset else 0.0,
                nonlinearity=preset.nonlinearity if preset else 0.0,
                sp=preset.sp if preset else 50.0,
                op_bias=preset.op_bias if preset else 50.0,
                sample_interval=row.sample_interval,
            )
        )
    return configs


def build_runtime_provider() -> RuntimeDataProvider:
    if settings.runtime_data_source == "tdengine":
        return TdengineRuntimeProvider()
    return MockRuntimeProvider()


_provider: RuntimeDataProvider = build_runtime_provider()
_source_manager = RuntimeSourceManager()


def get_runtime_provider() -> RuntimeDataProvider:
    return _provider


def get_runtime_source_manager() -> RuntimeSourceManager:
    return _source_manager


def reset_runtime_provider() -> RuntimeDataProvider:
    global _provider
    with _runtime_lock:
        _provider = build_runtime_provider()
    return _provider
