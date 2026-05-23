"""T9: Simulation — closed-loop response validation.

- Step response: simulate PID-controlled FOPDT process
- Frequency analysis: gain/phase margins
- Confidence scoring: how trustworthy is the tuning recommendation
"""

import math
from dataclasses import dataclass

from ..identification.engine import ProcessModel
from ..tuning.engine import PIDParams


@dataclass
class SimulationResult:
    tag_name: str
    # Step response metrics
    settling_time: float  # seconds to reach ±5% band
    overshoot_pct: float  # percent overshoot
    rise_time: float  # 10%→90% rise time (seconds)
    steady_state_error: float  # percent
    # Frequency domain
    gain_margin_db: float  # dB
    phase_margin_deg: float  # degrees
    # Confidence
    confidence_score: float  # 0-100
    confidence_level: str  # "high" / "medium" / "low"
    recommendation: str


@dataclass
class StepResponseData:
    time: list[float]  # seconds
    pv: list[float]
    sp: list[float]
    op: list[float]


def simulate_step_response(
    model: ProcessModel,
    pid: PIDParams,
    sp_change: float = 10.0,
    duration: float = 300.0,
    dt: float = 0.5,
) -> StepResponseData:
    """Simulate closed-loop PID step response for a FOPDT process."""
    K, tau, theta = model.gain, model.tau, model.dead_time
    if K == 0:
        K = 1.0
    if tau < dt:
        tau = dt * 2

    n = int(duration / dt)
    t = [i * dt for i in range(n)]
    pv = [0.0] * n
    sp = [0.0] * n
    op = [0.0] * n

    sp[0] = 0.0
    change_at = max(1, int(10.0 / dt))
    for i in range(change_at, n):
        sp[i] = sp_change

    # PID state
    integral = 0.0
    prev_error = 0.0
    delay_buffer = int(theta / dt) + 1
    pv_delayed = [0.0] * max(n, delay_buffer + 1)
    op_bias = 50.0

    for i in range(1, n):
        error = sp[i] - pv[i - 1]

        # PID output
        integral += error * dt
        if pid.Ti > 0:
            integral = max(-100, min(100, integral))  # anti-windup
        derivative = (error - prev_error) / dt if dt > 0 else 0

        op_raw = op_bias + pid.Kc * (error + integral / (pid.Ti if pid.Ti > 0 else 1) + pid.Td * derivative)
        op[i] = max(0.0, min(100.0, op_raw))

        # Process: FOPDT
        dpv = (K * op[i] - pv_delayed[i - 1]) / tau * dt
        raw_pv = pv[i - 1] + dpv

        if i < delay_buffer:
            pv_delayed[i] = raw_pv
            pv[i] = raw_pv
        else:
            pv_delayed[i] = raw_pv
            pv[i] = pv_delayed[max(0, i - delay_buffer)]

        prev_error = error

    return StepResponseData(time=t, pv=pv, sp=sp, op=op)


def analyze_simulation(sim: StepResponseData, sp_change: float = 10.0) -> SimulationResult:
    """Extract step response metrics from simulation data."""
    n = len(sim.pv)
    change_at = next((i for i, s in enumerate(sim.sp) if s > sp_change * 0.5), n // 10)
    if change_at >= n - 10:
        change_at = n // 10

    post_change = sim.pv[change_at:]
    steady_state = post_change[-1] if post_change else sp_change
    target = sp_change

    # Overshoot
    peak = max(post_change) if post_change else target
    overshoot_pct = max(0.0, (peak - target) / (abs(target) + 1e-6) * 100)

    # Rise time (10%→90%)
    t10 = next((i for i in range(change_at, n) if sim.pv[i] >= target * 0.1), change_at)
    t90 = next((i for i in range(t10, n) if sim.pv[i] >= target * 0.9), n - 1)
    rise_time = (t90 - t10) * (sim.time[1] - sim.time[0])

    # Settling time (±5% band)
    band_lo = target * 0.95
    band_hi = target * 1.05
    settled = n - 1
    for i in range(n - 1, change_at, -1):
        if not (band_lo <= sim.pv[i] <= band_hi):
            settled = i
            break
    settling_time = (settled - change_at) * (sim.time[1] - sim.time[0])

    # Steady-state error
    steady_state_error = abs(steady_state - target) / (abs(target) + 1e-6) * 100

    # Frequency domain (simplified from FOPDT + PID)
    gain_margin, phase_margin = _estimate_margins(sim, target, change_at)

    # Confidence score
    conf_score, conf_level = _compute_confidence(
        overshoot_pct, settling_time, steady_state_error, gain_margin, phase_margin,
    )

    return SimulationResult(
        tag_name="",
        settling_time=round(settling_time, 1),
        overshoot_pct=round(overshoot_pct, 1),
        rise_time=round(rise_time, 1),
        steady_state_error=round(steady_state_error, 2),
        gain_margin_db=round(gain_margin, 1),
        phase_margin_deg=round(phase_margin, 1),
        confidence_score=round(conf_score, 1),
        confidence_level=conf_level,
        recommendation=_make_recommendation(conf_level, overshoot_pct, settling_time),
    )


def _estimate_margins(sim: StepResponseData, target: float, change_at: int) -> tuple[float, float]:
    """Estimate gain and phase margins from step response oscillations."""
    post = sim.pv[change_at:]
    if len(post) < 10:
        return 6.0, 45.0
    # Count oscillation cycles to estimate phase margin
    crossings = 0
    for i in range(1, len(post)):
        if (post[i - 1] - target) * (post[i] - target) < 0:
            crossings += 1
    # More crossings = lower phase margin
    if crossings <= 2:
        phase = 60.0
    elif crossings <= 5:
        phase = 45.0
    else:
        phase = 30.0
    # Gain margin from overshoot ratio
    overshoot = max(0.0, (max(post) - target) / (abs(target) + 1e-6))
    gm = max(2.0, 10.0 - overshoot * 20)
    return gm, phase


def _compute_confidence(
    overshoot: float, settling: float, sse: float, gm: float, pm: float,
) -> tuple[float, str]:
    """0-100 confidence score based on simulation quality."""
    score = 100.0
    score -= min(30, overshoot * 0.6)  # overshoot penalty
    score -= min(20, max(0, (settling - 60) / 10))  # slow settling penalty
    score -= min(20, sse * 2)  # SSE penalty
    score -= min(20, max(0, (6 - gm) * 5))  # low GM penalty
    score -= min(10, max(0, (45 - pm) * 0.5))  # low PM penalty
    score = max(10.0, min(100.0, score))
    if score >= 70:
        level = "high"
    elif score >= 40:
        level = "medium"
    else:
        level = "low"
    return score, level


def _make_recommendation(level: str, overshoot: float, settling: float) -> str:
    if level == "high":
        return "整定参数可信度高，建议采纳。请在DCS中手动输入参数后观察实际响应。"
    if overshoot > 20:
        return "超调量偏大，建议降低Kc或增大Ti后重新仿真验证。"
    if settling > 120:
        return "响应偏慢，可考虑略微提高Kc以加快响应速度。"
    return "整定参数可信度中等，建议现场试投后根据实际响应微调。"
