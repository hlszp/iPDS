"""Runtime time-series provider contracts."""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Protocol

from .mock import LoopConfig


@dataclass
class RuntimeLoopData:
    config: LoopConfig
    timestamps: List[datetime]
    pv: List[float]
    sp: List[float]
    op: List[float]
    mode: List[str]
    source: str = "mock"
    generated_at: Optional[datetime] = None


@dataclass
class RuntimeProviderStatus:
    source: str
    healthy: bool
    freshness_seconds: Optional[float]
    detail: str


class RuntimeDataProvider(Protocol):
    def get_loop_data(self, tag_name: str, hours: float = 24, seed: int = 42) -> Optional[RuntimeLoopData]:
        ...

    def get_all_loop_data(self, hours: float = 24, seed: int = 42) -> List[RuntimeLoopData]:
        ...

    def get_status(self) -> RuntimeProviderStatus:
        ...
