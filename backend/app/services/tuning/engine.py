"""T8: PID Tuning — compute optimal controller parameters.

Methods:
- IMC (Internal Model Control) tuning for FOPDT models
- Lambda tuning (direct synthesis variant)
- Interactive: feature-point method (engineer marks points on trend)
- Interactive: trend-line method (engineer selects response segment)
"""

from dataclasses import dataclass
from typing import Optional

from ..identification.engine import ProcessModel


@dataclass
class PIDParams:
    Kc: float  # proportional gain
    Ti: float  # integral time (seconds), 0 = no integral
    Td: float  # derivative time (seconds), 0 = no derivative
    method: str
    closed_loop_tau: float  # expected closed-loop time constant


def tune_imc(model: ProcessModel, desired_tau: Optional[float] = None) -> PIDParams:
    """IMC-based PID tuning for FOPDT model.

    IMC tuning rule:
      Kc = (tau + theta/2) / (K * (lambda + theta/2))
      Ti = tau + theta/2
      Td = tau * theta / (2*tau + theta)

    where lambda is the desired closed-loop time constant.
    Default lambda = max(tau, 3*theta) for robustness.
    """
    K, tau, theta = abs(model.gain), model.tau, model.dead_time
    if K < 0.001:
        K = 1.0
    if tau < 0.1:
        tau = 1.0

    lbd = desired_tau if desired_tau else max(tau, 3 * theta)
    if lbd < 0.1:
        lbd = 1.0

    Kc = (tau + theta / 2) / (K * (lbd + theta / 2))
    Ti = tau + theta / 2
    Td = tau * theta / (2 * tau + theta + 1e-6)

    return PIDParams(
        Kc=round(Kc, 4),
        Ti=round(Ti, 1),
        Td=round(Td, 1),
        method="IMC",
        closed_loop_tau=round(lbd, 1),
    )


def tune_lambda(model: ProcessModel, desired_tau: Optional[float] = None) -> PIDParams:
    """Lambda (Direct Synthesis) tuning.

    Similar to IMC but uses a different closed-loop target.
      Kc = tau / (K * (lambda + theta))
      Ti = tau
      Td = 0 (PI only by default)

    Conservative — good for noisy or uncertain processes.
    """
    K, tau, theta = abs(model.gain), model.tau, model.dead_time
    if K < 0.001:
        K = 1.0
    if tau < 0.1:
        tau = 1.0

    lbd = desired_tau if desired_tau else max(tau, 2 * theta)
    if lbd < 0.1:
        lbd = 1.0

    Kc = tau / (K * (lbd + theta))
    Ti = tau
    Td = 0.0

    return PIDParams(
        Kc=round(Kc, 4),
        Ti=round(Ti, 1),
        Td=round(Td, 1),
        method="Lambda",
        closed_loop_tau=round(lbd, 1),
    )


def tune_imc_aggressive(model: ProcessModel) -> PIDParams:
    """IMC-PID with aggressive tuning (lambda = theta)."""
    return tune_imc(model, desired_tau=max(1.0, model.dead_time))


def interactive_feature_points(
    model: ProcessModel,
    response_time_to_steady: float,
    overshoot_acceptable: bool = True,
) -> PIDParams:
    """Interactive tuning: engineer provides key features from trend observation.

    response_time_to_steady: seconds to reach steady state (from trend)
    overshoot_acceptable: whether some overshoot is allowed
    """
    tau_est = response_time_to_steady / 4.0  # ~4 time constants to steady state
    K, theta = abs(model.gain), model.dead_time
    if K < 0.001:
        K = 1.0

    if overshoot_acceptable:
        Kc = 1.2 * tau_est / (K * (theta + 1.0))
        Ti = 2.0 * theta
        Td = 0.5 * theta
    else:
        Kc = 0.6 * tau_est / (K * (theta + 1.0))
        Ti = tau_est
        Td = 0.0

    return PIDParams(
        Kc=round(Kc, 4), Ti=round(Ti, 1), Td=round(Td, 1),
        method="交互式-特征点法", closed_loop_tau=round(tau_est, 1),
    )


def interactive_trend_line(
    model: ProcessModel,
    slope: float,  # PV slope during response (units/sec)
    delay: float,  # observed dead time (seconds)
) -> PIDParams:
    """Interactive tuning: engineer selects response segment and provides slope + delay."""
    K = abs(model.gain) if abs(model.gain) > 0.001 else 1.0
    tau_est = abs(K * 10.0 / (slope + 1e-6))  # rough estimate from slope

    Kc = 0.8 * tau_est / (K * (delay + 1.0))
    Ti = min(tau_est, 3 * delay)
    Td = 0.0

    return PIDParams(
        Kc=round(Kc, 4), Ti=round(Ti, 1), Td=round(Td, 1),
        method="交互式-趋势线法", closed_loop_tau=round(tau_est, 1),
    )
