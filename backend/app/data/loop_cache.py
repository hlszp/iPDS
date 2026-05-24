"""In-memory cache for generated loop time-series data."""

import threading
import time
from typing import Optional

from .mock import LoopConfig, LoopData, PRESET_LOOPS, generate_loop_data

_cache: dict[str, tuple[LoopData, float]] = {}
_lock = threading.Lock()
TTL = 60.0  # seconds


def get_loop_data(tag_name: str, hours: float = 24, seed: int = 42) -> Optional[LoopData]:
    key = f"{tag_name}_{hours}_{seed}"
    now = time.time()
    with _lock:
        if key in _cache:
            data, ts = _cache[key]
            if now - ts < TTL:
                return data
    config = _find_config(tag_name)
    if config is None:
        return None
    data = generate_loop_data(config, duration_hours=hours, seed=seed)
    with _lock:
        _cache[key] = (data, now)
    return data


def get_all_loop_data(hours: float = 24, seed: int = 42) -> list[LoopData]:
    return [get_loop_data(c.tag_name, hours, seed) for c in PRESET_LOOPS]


def _find_config(tag_name: str) -> Optional[LoopConfig]:
    for c in PRESET_LOOPS:
        if c.tag_name == tag_name:
            return c
    return None
