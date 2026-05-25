"""T6: Fault Diagnosis — detect root causes of poor loop performance.

Four detection methods:
- Valve stiction (Horch cross-correlation method)
- Oscillation (autocorrelation + period estimation)
- Nonlinearity (bispectrum-inspired simplified analysis)
- Loop coupling (cross-correlation matrix)
"""

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class DiagnosisResult:
    tag_name: str
    stiction_detected: bool
    stiction_confidence: float  # 0-1
    oscillation_detected: bool
    oscillation_period: Optional[float]  # seconds
    oscillation_confidence: float
    nonlinearity_detected: bool
    nonlinearity_degree: float  # 0-1
    coupling_candidates: list[str]  # tags of potentially coupled loops
    coupling_strength: float  # 0-1
    settling_time: Optional[float]  # seconds
    travel_index: float  # 0-1
    good_rate: float  # 0-100 percent
    primary_fault: str  # "stiction" / "oscillation" / "nonlinearity" / "coupling" / "none"


def diagnose_loop(
    tag_name: str,
    pv: list[float],
    sp: list[float],
    op: list[float],
    neighbor_data: Optional[dict[str, tuple[list[float], list[float]]]] = None,
    sample_interval: float = 1.0,
) -> DiagnosisResult:
    pv_a = np.array(pv, dtype=float)
    sp_a = np.array(sp, dtype=float)
    op_a = np.array(op, dtype=float)
    n = len(pv_a)

    if n < 60:
        return _empty_diagnosis(tag_name)

    # 1. Valve stiction: Horch method — cross-correlation between OP and PV changes
    stiction_conf, stiction = _detect_stiction(pv_a, op_a)

    # 2. Oscillation: autocorrelation
    osc_conf, osc_period, osc = _detect_oscillation_diag(pv_a, sample_interval)

    # 3. Nonlinearity
    nl_degree, nl = _detect_nonlinearity_diag(pv_a, op_a)

    # 4. Coupling
    coupling_tags, coupling_strength = _detect_coupling(tag_name, pv_a, neighbor_data)

    settling_time = _estimate_settling_time(pv_a, sp_a, sample_interval)
    travel_index = _estimate_travel_index(op_a)
    good_rate = _estimate_good_rate(pv_a, sp_a)

    # Determine primary fault
    faults = [
        ("stiction", stiction_conf, stiction),
        ("oscillation", osc_conf, osc),
        ("nonlinearity", nl_degree, nl),
        ("coupling", coupling_strength, len(coupling_tags) > 0),
    ]
    faults.sort(key=lambda x: x[1], reverse=True)
    primary = faults[0][0] if faults[0][1] > 0.5 else "none"

    return DiagnosisResult(
        tag_name=tag_name,
        stiction_detected=stiction,
        stiction_confidence=round(stiction_conf, 3),
        oscillation_detected=osc,
        oscillation_period=round(osc_period, 1) if osc_period else None,
        oscillation_confidence=round(osc_conf, 3),
        nonlinearity_detected=nl,
        nonlinearity_degree=round(nl_degree, 3),
        coupling_candidates=coupling_tags,
        coupling_strength=round(coupling_strength, 3),
        settling_time=round(settling_time, 1) if settling_time is not None else None,
        travel_index=round(travel_index, 3),
        good_rate=round(good_rate, 1),
        primary_fault=primary,
    )


def _detect_stiction(pv: np.ndarray, op: np.ndarray) -> tuple[float, bool]:
    """Horch method: if OP moves but PV doesn't respond in a correlated way, valve is sticky."""
    dpv = np.diff(pv)
    dop = np.diff(op)
    if len(dpv) < 10:
        return 0.0, False
    # Stiction causes flat PV segments despite OP changes
    pv_flat = np.abs(dpv) < np.std(dpv) * 0.1
    op_moving = np.abs(dop) > np.std(dop) * 0.1
    sticky_fraction = np.sum(pv_flat & op_moving) / len(dpv)
    confidence = min(1.0, sticky_fraction * 5)  # scale up
    stiction = bool(confidence > 0.6)
    return confidence, stiction


def _detect_oscillation_diag(pv: np.ndarray, dt: float) -> tuple[float, Optional[float], bool]:
    """Autocorrelation-based oscillation detection."""
    n = len(pv)
    if n < 20:
        return 0.0, None, False
    pv_d = pv - np.mean(pv)
    ac = np.correlate(pv_d, pv_d, mode="full")[n - 1:]
    ac = ac / (ac[0] + 1e-10)
    # Find peaks in autocorrelation
    peaks = []
    for i in range(2, len(ac) - 2):
        if ac[i] > ac[i - 1] and ac[i] > ac[i + 1] and ac[i] > 0.2:
            peaks.append((i, ac[i]))
    if len(peaks) >= 2:
        period = (peaks[1][0] - peaks[0][0]) * dt
        confidence = min(1.0, peaks[0][1])
        return confidence, period, confidence > 0.4
    return 0.0, None, False


def _detect_nonlinearity_diag(pv: np.ndarray, op: np.ndarray) -> tuple[float, bool]:
    """Simplified nonlinearity detection via quadratic fit residuals."""
    mask = (op > 1) & (op < 99)
    if np.sum(mask) < 20:
        return 0.0, False
    op_f, pv_f = op[mask], pv[mask]
    if np.ptp(op_f) < 1e-6:
        return 0.0, False
    lin = np.polyfit(op_f, pv_f, 1)
    quad = np.polyfit(op_f, pv_f, 2)
    lin_res = np.sum((np.polyval(lin, op_f) - pv_f) ** 2)
    quad_res = np.sum((np.polyval(quad, op_f) - pv_f) ** 2)
    degree = 1.0 - quad_res / (lin_res + 1e-10)
    degree = max(0.0, min(1.0, degree))
    return degree, degree > 0.3


def _detect_coupling(
    tag: str, pv: np.ndarray, neighbors: Optional[dict[str, tuple[list[float], list[float]]]]
) -> tuple[list[str], float]:
    """Detect coupling via cross-correlation with neighboring loops."""
    if not neighbors:
        return [], 0.0
    coupled = []
    max_corr = 0.0
    for ntag, (npv, _) in neighbors.items():
        if ntag == tag or len(npv) != len(pv):
            continue
        corr = np.corrcoef(pv, np.array(npv))[0, 1]
        if abs(corr) > 0.6:
            coupled.append(ntag)
            max_corr = max(max_corr, abs(corr))
    return coupled, max_corr


def _estimate_settling_time(pv: np.ndarray, sp: np.ndarray, dt: float) -> Optional[float]:
    if len(pv) < 10:
        return None
    sp_final = float(np.median(sp[-max(5, len(sp) // 10):]))
    band = max(abs(sp_final) * 0.02, 1e-6)
    within_band = np.abs(pv - sp_final) <= band
    for idx in range(len(pv)):
        if np.all(within_band[idx:]):
            return idx * dt
    return None


def _estimate_travel_index(op: np.ndarray) -> float:
    if len(op) < 2:
        return 0.0
    travel = np.sum(np.abs(np.diff(op)))
    span = max(float(np.max(op) - np.min(op)), 1e-6)
    normalized = travel / (len(op) * span)
    return min(1.0, max(0.0, float(normalized)))


def _estimate_good_rate(pv: np.ndarray, sp: np.ndarray) -> float:
    if len(pv) == 0:
        return 0.0
    error = np.abs(pv - sp)
    tolerance = np.maximum(np.abs(sp) * 0.02, 1e-6)
    return float(np.mean(error <= tolerance) * 100)


def _empty_diagnosis(tag: str) -> DiagnosisResult:
    return DiagnosisResult(
        tag_name=tag, stiction_detected=False, stiction_confidence=0,
        oscillation_detected=False, oscillation_period=None, oscillation_confidence=0,
        nonlinearity_detected=False, nonlinearity_degree=0,
        coupling_candidates=[], coupling_strength=0,
        settling_time=None, travel_index=0, good_rate=0,
        primary_fault="none",
    )
