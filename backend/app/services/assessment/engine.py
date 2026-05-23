"""T5: Performance Assessment — KPI calculation & loop grading.

Implements GB/T 44693.2-2024 performance metrics:
- Self-control rate (自控率)
- Stability rate (平稳率)
- Performance score with weighted dimensions
- Five-level grading (优/良/中/差/开环)
- Trend detection for early warning
"""

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class LoopAssessment:
    tag_name: str
    unit: str
    self_control_rate: float  # 0-100 percent
    stability_rate: float  # 0-100 percent
    performance_score: float  # 0-100 weighted composite
    grade: str  # 优/良/中/差/开环
    iae: float  # Integral Absolute Error (normalized)
    oscillation_index: float  # 0-1, higher = more oscillatory
    oscillation_period: Optional[float]  # seconds, if oscillating
    valve_saturation_rate: float  # 0-1, OP at limits
    operation_frequency: float  # mode changes per hour
    nonlinearity_degree: float  # 0-1
    reference_time: str  # assessment window


@dataclass
class TrendAlert:
    tag_name: str
    metric: str
    direction: str  # "declining" or "improving"
    days: int
    current_value: float
    previous_value: float


def assess_loop(
    pv: list[float],
    sp: list[float],
    op: list[float],
    mode: list[str],
    tag_name: str = "",
    unit: str = "",
    sample_interval: float = 1.0,
    stability_threshold: float = 2.0,
) -> LoopAssessment:
    """Compute all KPIs for a single loop."""
    pv_a = np.array(pv, dtype=float)
    sp_a = np.array(sp, dtype=float)
    op_a = np.array(op, dtype=float)

    n = len(pv_a)
    if n < 10:
        return _empty_assessment(tag_name, unit)

    # Self-control rate: time in AUTO/CASCADE mode
    auto_count = sum(1 for m in mode if m in ("AUTO", "CASCADE"))
    self_control_rate = auto_count / len(mode) * 100 if mode else 100.0

    # Stability rate: time PV within SP ± threshold%
    deviation_pct = np.abs((pv_a - sp_a) / np.clip(np.abs(sp_a), 1e-6, None)) * 100
    stable_count = np.sum(deviation_pct <= stability_threshold)
    stability_rate = stable_count / n * 100

    # IAE (normalized by |SP|)
    iae = np.sum(np.abs(pv_a - sp_a)) / n / (np.mean(np.abs(sp_a)) + 1e-6)

    # Oscillation index: autocorrelation-based
    oscillation_index, oscillation_period = _detect_oscillation(pv_a, sample_interval)

    # Valve saturation: OP at 0% or 100%
    saturation_count = np.sum((op_a <= 0.5) | (op_a >= 99.5))
    valve_saturation_rate = saturation_count / n

    # Operation frequency: AUTO↔MAN transitions per hour
    if mode:
        transitions = sum(1 for i in range(1, len(mode)) if mode[i] != mode[i - 1])
        hours = n * sample_interval / 3600
        operation_frequency = transitions / hours if hours > 0 else 0
    else:
        operation_frequency = 0.0

    # Nonlinearity: deviation from linear PV-OP relationship
    if n > 20:
        nonlinearity_degree = _estimate_nonlinearity(pv_a, op_a)
    else:
        nonlinearity_degree = 0.0

    # Weighted performance score (weights per GB/T 44693.2-2024)
    score = (
        0.25 * _score_component(stability_rate, 100, True) +
        0.20 * _score_component(1.0 / (iae + 0.1), 2.0, True) +
        0.15 * (1.0 - oscillation_index) * 100 +
        0.15 * (1.0 - valve_saturation_rate) * 100 +
        0.10 * _score_component(1.0 / (operation_frequency + 0.1), 2.0, True) +
        0.10 * (1.0 - nonlinearity_degree) * 100 +
        0.05 * self_control_rate
    )
    performance_score = max(0.0, min(100.0, score))

    # Grading
    grade = _assign_grade(stability_rate, oscillation_index, self_control_rate)

    return LoopAssessment(
        tag_name=tag_name,
        unit=unit,
        self_control_rate=round(self_control_rate, 1),
        stability_rate=round(stability_rate, 1),
        performance_score=round(performance_score, 1),
        grade=grade,
        iae=round(iae, 4),
        oscillation_index=round(oscillation_index, 3),
        oscillation_period=round(oscillation_period, 1) if oscillation_period else None,
        valve_saturation_rate=round(valve_saturation_rate, 3),
        operation_frequency=round(operation_frequency, 2),
        nonlinearity_degree=round(nonlinearity_degree, 3),
        reference_time="",
    )


def detect_trend(history: list[LoopAssessment], window_days: int = 7) -> list[TrendAlert]:
    """Detect declining trends in loop performance over consecutive days."""
    if len(history) < window_days:
        return []
    recent = history[-window_days:]
    alerts = []
    for metric, label in [("stability_rate", "平稳率"), ("performance_score", "性能评分")]:
        values = [getattr(a, metric) for a in recent]
        if all(values[i] >= values[i + 1] for i in range(len(values) - 1)):
            alerts.append(TrendAlert(
                tag_name=recent[-1].tag_name,
                metric=label,
                direction="declining",
                days=window_days,
                current_value=values[-1],
                previous_value=values[0],
            ))
    return alerts


def _score_component(value: float, max_val: float, higher_better: bool) -> float:
    """Normalize a metric to 0-100 score."""
    ratio = value / max_val if max_val > 0 else 0
    return max(0.0, min(100.0, ratio * 100)) if higher_better else max(0.0, min(100.0, (1 - ratio) * 100))


def _detect_oscillation(pv: np.ndarray, dt: float) -> tuple[float, Optional[float]]:
    """Detect oscillation using autocorrelation zero-crossing."""
    n = len(pv)
    if n < 20:
        return 0.0, None
    pv_detrended = pv - np.mean(pv)
    autocorr = np.correlate(pv_detrended, pv_detrended, mode="full")[n - 1:]
    autocorr = autocorr / (autocorr[0] + 1e-10)
    # Find first zero crossing after first minimum
    for i in range(2, len(autocorr) - 1):
        if autocorr[i] < autocorr[i - 1] and autocorr[i] < autocorr[i + 1]:
            # Found first minimum — look for zero crossing after it
            for j in range(i, len(autocorr) - 1):
                if autocorr[j] <= 0 <= autocorr[j + 1] or autocorr[j] >= 0 >= autocorr[j + 1]:
                    period = 2 * j * dt  # approximate
                    if 5 < period < 3600:  # reasonable range
                        oscillation_strength = 1.0 - abs(autocorr[i])
                        return min(1.0, max(0.0, oscillation_strength)), period
                    break
            break
    return 0.0, None


def _estimate_nonlinearity(pv: np.ndarray, op: np.ndarray) -> float:
    """Estimate nonlinearity via deviation from linear fit."""
    mask = (op > 1) & (op < 99)
    if np.sum(mask) < 10:
        return 0.0
    op_f = op[mask]
    pv_f = pv[mask]
    coeffs = np.polyfit(op_f, pv_f, 1)
    linear_pred = np.polyval(coeffs, op_f)
    residuals = np.abs(pv_f - linear_pred)
    total = np.abs(pv_f - np.mean(pv_f))
    r = np.sum(residuals) / (np.sum(total) + 1e-10)
    return min(1.0, float(r))


def _assign_grade(stability_rate: float, oscillation_index: float, self_control_rate: float) -> str:
    """Five-level grading per GB/T 44693.2-2024."""
    if self_control_rate < 50:
        return "开环"
    if stability_rate >= 95 and oscillation_index < 0.1:
        return "优"
    if stability_rate >= 85 and oscillation_index < 0.3:
        return "良"
    if stability_rate >= 65:
        return "中"
    return "差"


def _empty_assessment(tag_name: str, unit: str) -> LoopAssessment:
    return LoopAssessment(
        tag_name=tag_name, unit=unit,
        self_control_rate=0, stability_rate=0, performance_score=0,
        grade="开环", iae=0, oscillation_index=0, oscillation_period=None,
        valve_saturation_rate=0, operation_frequency=0, nonlinearity_degree=0,
        reference_time="",
    )
