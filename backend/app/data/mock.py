"""Mock data layer — synthetic loop data generator and CSV importer.

Generates realistic PID loop time-series (PV, SP, OP, MODE) for
algorithm development and testing. Each loop has known ground-truth
characteristics so validation is deterministic.
"""

import csv
import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np


@dataclass
class LoopConfig:
    """Ground-truth configuration for a synthetic loop."""

    tag_name: str
    unit: str
    loop_type: str  # FLOW/LEVEL/TEMP/PRESSURE
    description: str = ""
    # Process model (FOPDT): K / (tau*s + 1) * exp(-theta*s)
    gain: float = 1.0
    tau: float = 10.0  # time constant (seconds)
    dead_time: float = 2.0  # seconds
    # Noise
    noise_std: float = 0.02
    # Fault injection (for diagnosis validation)
    stiction: float = 0.0  # valve stiction band (0 = none)
    oscillation_period: float = 0.0  # oscillation period (0 = none)
    nonlinearity: float = 0.0  # 0-1, degree of nonlinearity
    # Operating
    sp: float = 50.0
    op_bias: float = 50.0
    sample_interval: int = 60  # seconds (realistic DCS scan rate)


@dataclass
class LoopData:
    """Time-series data for one loop."""

    config: LoopConfig
    timestamps: list[datetime] = field(default_factory=list)
    pv: list[float] = field(default_factory=list)
    sp: list[float] = field(default_factory=list)
    op: list[float] = field(default_factory=list)
    mode: list[str] = field(default_factory=list)  # AUTO/MAN/CASCADE

    @property
    def length(self) -> int:
        return len(self.timestamps)

    def as_dict(self) -> dict:
        return {
            "tag_name": self.config.tag_name,
            "timestamps": [t.isoformat() for t in self.timestamps],
            "pv": self.pv,
            "sp": self.sp,
            "op": self.op,
            "mode": self.mode,
        }


def generate_loop_data(config: LoopConfig, duration_hours: float = 24, seed: int = 42) -> LoopData:
    """Generate synthetic closed-loop PID data with known process characteristics.

    Simulates internally at 1-second steps for numerical stability, then
    downsamples to the configured sample_interval.
    """
    rng = np.random.default_rng(seed)
    internal_dt = 1.0  # fine step for stable Euler integration
    output_interval = max(1, int(config.sample_interval))
    downsample = max(1, output_interval)
    total_seconds = int(duration_hours * 3600)
    n_internal = total_seconds + 1
    n = n_internal // downsample
    dt = internal_dt

    pv_int = np.zeros(n_internal)
    sp_int = np.zeros(n_internal)
    op_int = np.zeros(n_internal)

    # Generate SP profile at internal resolution
    sp_int[:] = config.sp
    n_changes = min(8, max(2, n_internal // 7200))
    change_times = sorted(rng.integers(n_internal // 12, max(n_internal // 12 + 1, n_internal - 1800), size=n_changes))
    current_sp = config.sp
    for ct in change_times:
        current_sp += rng.uniform(-12, 12)
        current_sp = max(5, min(95, current_sp))
        sp_int[ct:] = current_sp

    # PI controller parameters (intentionally loose to create excitation)
    Kp = 0.15 / max(0.1, abs(config.gain))
    Ti = max(10.0, config.tau * 2.0)
    integral = 0.0

    # Dead-time ring buffer (steps at internal resolution)
    delay_steps = max(1, int(config.dead_time / dt))
    pv_buffer = [config.sp] * delay_steps

    op_ss = config.op_bias
    pv_int[0] = config.sp
    op_int[0] = op_ss

    for i in range(1, n_internal):
        error = sp_int[i] - pv_int[i - 1]
        integral += error * dt
        integral = max(-50.0 * Ti, min(50.0 * Ti, integral))
        op_raw = op_ss + Kp * (error + integral / Ti)

        if config.stiction > 0 and abs(op_raw - op_int[i - 1]) < config.stiction:
            op_raw = op_int[i - 1]

        if config.oscillation_period > 0:
            op_raw += 3.0 * math.sin(2 * math.pi * i * dt / config.oscillation_period)

        op_int[i] = float(np.clip(op_raw, 0.0, 100.0))

        pv_new = pv_buffer.pop(0)
        dpv = (config.gain * op_int[i] - pv_new) / config.tau * dt
        pv_new += dpv

        if config.nonlinearity > 0:
            pv_new += config.nonlinearity * 0.005 * (op_int[i] - op_ss) ** 2 * dt

        pv_buffer.append(pv_new)
        pv_int[i] = pv_buffer[0]
        pv_int[i] += rng.normal(0, config.noise_std * abs(config.sp))

    # Downsample to output resolution
    pv = pv_int[::downsample][:n]
    sp = sp_int[::downsample][:n]
    op = op_int[::downsample][:n]
    mode = ["AUTO"] * n

    start = datetime(2026, 5, 22, 6, 0, 0)
    timestamps = [start + timedelta(seconds=float(i * downsample)) for i in range(n)]

    return LoopData(
        config=config, timestamps=timestamps,
        pv=pv.tolist(), sp=sp.tolist(), op=op.tolist(), mode=mode,
    )


def _apply_stiction(op_raw: float, op_prev: float, band: float) -> float:
    """Simple stiction model: OP sticks until control action exceeds band."""
    if abs(op_raw - op_prev) < band:
        return op_prev
    return op_raw


def load_from_csv(path: Path, config: LoopConfig) -> LoopData:
    """Import real loop data from CSV with columns: timestamp,pv,sp,op,mode."""
    data = LoopData(config=config)
    with open(path) as f:
        for row in csv.DictReader(f):
            data.timestamps.append(datetime.fromisoformat(row["timestamp"]))
            data.pv.append(float(row["pv"]))
            data.sp.append(float(row["sp"]))
            data.op.append(float(row["op"]))
            data.mode.append(row.get("mode", "AUTO"))
    return data


# Pre-built loop set matching cockpit heatmap
PRESET_LOOPS: list[LoopConfig] = [
    # === 甲醇装置 (problems: stiction, oscillation) ===
    LoopConfig("FIC-10023", "甲醇装置", "FLOW", "甲醇进料流量", gain=1.2, tau=8.0, dead_time=3.0, stiction=1.5, noise_std=0.03),
    LoopConfig("PIC-60033", "甲醇装置", "PRESSURE", "合成塔压力", gain=0.8, tau=25.0, dead_time=5.0, oscillation_period=120, noise_std=0.02),
    LoopConfig("TIC-61001", "甲醇装置", "TEMP", "反应器温度", gain=1.5, tau=60.0, dead_time=15.0, noise_std=0.01),
    LoopConfig("LIC-61002", "甲醇装置", "LEVEL", "分离器液位", gain=1.0, tau=30.0, dead_time=1.0, noise_std=0.04),
    # === PSA 制氢 (problems: stiction, coupling) ===
    LoopConfig("PIC-20015", "PSA 制氢", "PRESSURE", "吸附塔压力", gain=0.6, tau=20.0, dead_time=4.0, stiction=2.0, oscillation_period=90, noise_std=0.03),
    LoopConfig("FIC-20020", "PSA 制氢", "FLOW", "氢气产品流量", gain=1.0, tau=12.0, dead_time=2.0, noise_std=0.02),
    LoopConfig("LIC-70019", "PSA 制氢", "LEVEL", "缓冲罐液位", gain=1.0, tau=40.0, dead_time=1.5, noise_std=0.05),
    # === 氨合成 (problems: stiction) ===
    LoopConfig("LIC-30042", "氨合成", "LEVEL", "氨分离器液位", gain=0.9, tau=35.0, dead_time=2.0, stiction=1.8, noise_std=0.03),
    LoopConfig("TIC-80002", "氨合成", "TEMP", "合成塔温度", gain=2.0, tau=80.0, dead_time=20.0, stiction=1.2, noise_std=0.015),
    LoopConfig("PIC-30050", "氨合成", "PRESSURE", "循环气压力", gain=0.7, tau=18.0, dead_time=3.0, noise_std=0.02),
    # === 低温甲醇洗 ===
    LoopConfig("TIC-40008", "低温甲醇洗", "TEMP", "甲醇温度", gain=1.3, tau=45.0, dead_time=10.0, oscillation_period=150, noise_std=0.02),
    LoopConfig("FIC-40012", "低温甲醇洗", "FLOW", "甲醇循环流量", gain=1.1, tau=10.0, dead_time=2.0, noise_std=0.02),
    # === 气化 ===
    LoopConfig("FIC-50011", "气化", "FLOW", "氧气流量", gain=0.5, tau=5.0, dead_time=1.0, noise_std=0.04),
    LoopConfig("PIC-50020", "气化", "PRESSURE", "气化炉压力", gain=0.4, tau=15.0, dead_time=3.0, noise_std=0.03),
    # === 其他装置 (good performers) ===
    LoopConfig("FIC-90001", "冷冻站", "FLOW", "冷冻水流量", gain=1.0, tau=6.0, dead_time=1.0, noise_std=0.01),
    LoopConfig("PIC-90002", "冷冻站", "PRESSURE", "冷冻水压力", gain=0.9, tau=8.0, dead_time=1.5, noise_std=0.01),
    LoopConfig("TIC-91001", "硫回收制酸", "TEMP", "焚烧炉温度", gain=1.8, tau=50.0, dead_time=12.0, noise_std=0.02),
    LoopConfig("LIC-92001", "CO 分离及压缩", "LEVEL", "分离器液位", gain=1.0, tau=28.0, dead_time=1.5, noise_std=0.03),
    LoopConfig("FIC-93001", "液氮洗", "FLOW", "氮气流量", gain=0.7, tau=7.0, dead_time=1.0, noise_std=0.02),
    LoopConfig("FIC-94001", "变换及热回收", "FLOW", "变换气流量", gain=1.0, tau=9.0, dead_time=2.0, noise_std=0.02),
    LoopConfig("PIC-95001", "醋酸装置", "PRESSURE", "反应器压力", gain=0.8, tau=22.0, dead_time=4.0, noise_std=0.02),
]
