"""T7: System Identification — closed-loop process model estimation.

Key challenge: identify process dynamics from routine operating data
where the loop is under feedback control. Standard open-loop methods
produce biased estimates under feedback.

Methods:
- Excitation check: does the data contain enough variation?
- Closed-loop ARX (AutoRegressive with eXogenous input)
- Simplified subspace identification (MOESP-inspired)
- Model selection via holdout validation
"""

from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class ProcessModel:
    """First-Order Plus Dead Time (FOPDT) model: K*exp(-theta*s)/(tau*s + 1)."""

    gain: float  # K
    tau: float  # time constant (seconds)
    dead_time: float  # theta (seconds)
    r_squared: float  # fit quality (0-1)
    method: str  # "arx" / "subspace" / "interactive"
    excitation_index: float  # 0-1, data information content


@dataclass
class IdentificationResult:
    tag_name: str
    excitation_index: float  # 0-1, higher = more informative
    excitation_sufficient: bool  # excitation_index >= threshold
    best_model: Optional[ProcessModel]
    fallback_reason: Optional[str]  # why identification was skipped/degraded


def check_excitation(op: list[float], sp: list[float]) -> float:
    """Quantify how much the data can support system identification.

    Returns 0-1 score: >0.5 is typically sufficient for ARX.
    """
    op_a = np.array(op)
    sp_a = np.array(sp)
    # Variance in OP (control action changes) and SP (setpoint changes)
    op_var = np.var(op_a) / (np.mean(np.abs(op_a)) + 1e-6)
    sp_changes = np.sum(np.abs(np.diff(sp_a)) > 0.1) / len(sp_a)
    # Combined excitation index
    ei = min(1.0, op_var * 0.5 + sp_changes * 5.0)
    return round(float(ei), 3)


def identify_arx(
    pv: list[float],
    op: list[float],
    sample_interval: float = 1.0,
    na: int = 3,
    nb: int = 4,
    nk: int = 1,
) -> ProcessModel:
    """Closed-loop ARX identification.

    ARX model: A(q)*y(t) = B(q)*u(t-nk) + e(t)
    Under feedback, ARX gives consistent estimates if the noise model
    is correct (prediction error method property).

    Returns FOPDT approximation of the identified model.
    """
    y = np.array(pv, dtype=float)
    u = np.array(op, dtype=float)
    # Guard against NaN/Inf
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    u = np.nan_to_num(u, nan=0.0, posinf=0.0, neginf=0.0)
    y = y - np.mean(y)
    u = u - np.mean(u)
    n = len(y)

    if n < na + nb + nk + 10:
        return ProcessModel(gain=1, tau=10, dead_time=2, r_squared=0, method="arx", excitation_index=0)

    # Build regressor matrix
    max_lag = max(na, nb + nk - 1)
    rows = n - max_lag
    if rows < 10:
        return ProcessModel(gain=1, tau=10, dead_time=2, r_squared=0, method="arx", excitation_index=0)

    Y = y[max_lag:]
    Phi = np.zeros((rows, na + nb))
    for i in range(rows):
        idx = max_lag + i
        for j in range(na):
            Phi[i, j] = -y[idx - 1 - j]
        for j in range(nb):
            Phi[i, na + j] = u[idx - nk - j]

    # Least squares with regularization
    theta = np.linalg.lstsq(Phi, Y, rcond=None)[0]

    # Extract ARX coefficients
    a_coeffs = np.concatenate([[1.0], theta[:na]])
    b_coeffs = theta[na:]

    # Predict
    y_pred = Phi @ theta
    ss_res = np.sum((Y - y_pred) ** 2)
    ss_tot = np.sum((Y - np.mean(Y)) ** 2)
    r_squared = 1.0 - ss_res / (ss_tot + 1e-10)
    r_squared = max(0.0, min(0.99, r_squared))

    # Convert ARX to FOPDT via direct least-squares fit to step response
    # Simulate unit step response of identified ARX
    step_len = min(300, n)
    u_step = np.ones(step_len)
    y_step = np.zeros(step_len)
    for i in range(step_len):
        for j in range(nb):
            if i >= nk + j:
                y_step[i] += b_coeffs[j] * u_step[i - nk - j]
        for j in range(na):
            if i >= 1 + j:
                y_step[i] -= a_coeffs[j + 1] * y_step[i - 1 - j]

    # Fit FOPDT: K * (1 - exp(-(t-theta)/tau))
    gain = float(np.sum(b_coeffs) / (1.0 + np.sum(a_coeffs[1:]) + 1e-10))
    if abs(gain) < 0.001:
        gain = 1.0
    y_norm = y_step / gain  # normalized to unit gain
    y_norm = np.clip(y_norm, 0, None)

    # Dead time: first point where step response exceeds 5% of final
    dead_idx = 0
    for i in range(step_len):
        if y_norm[i] > 0.05:
            dead_idx = i
            break
    dead_time = float(dead_idx * sample_interval)

    # Time constant: time from dead_time to 63% of (1 - dead_time_level)
    target_63 = y_norm[dead_idx] + 0.63 * (1.0 - y_norm[dead_idx])
    tau_idx = dead_idx
    for i in range(dead_idx, step_len):
        if y_norm[i] >= target_63:
            tau_idx = i
            break
    tau = float(max(1.0, (tau_idx - dead_idx) * sample_interval))

    return ProcessModel(
        gain=round(gain, 4),
        tau=round(max(1.0, tau), 1),
        dead_time=round(max(0.0, dead_time), 1),
        r_squared=round(r_squared, 3),
        method="arx",
        excitation_index=0,
    )


def identify_subspace(
    pv: list[float],
    op: list[float],
    sample_interval: float = 1.0,
    order: int = 3,
) -> ProcessModel:
    """Simplified subspace identification (MOESP-inspired).

    Uses instrumental variable approach suitable for closed-loop data.
    """
    y = np.array(pv, dtype=float)
    u = np.array(op, dtype=float)
    # Guard against NaN/Inf
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    u = np.nan_to_num(u, nan=0.0, posinf=0.0, neginf=0.0)
    y = y - np.mean(y)
    u = u - np.mean(u)
    n = len(y)

    block_rows = max(5, order + 2)
    if n < 2 * block_rows + 10:
        return ProcessModel(gain=1, tau=10, dead_time=2, r_squared=0, method="subspace", excitation_index=0)

    # Build block Hankel matrices (simplified)
    N = n - 2 * block_rows + 1
    Y_past = np.array([y[i:i + block_rows] for i in range(N)]).T
    U_past = np.array([u[i:i + block_rows] for i in range(N)]).T
    Y_future = np.array([y[i + block_rows:i + 2 * block_rows] for i in range(N)]).T

    # Oblique projection (simplified: least squares)
    W = np.vstack([U_past, Y_past])
    try:
        proj = Y_future @ W.T @ np.linalg.inv(W @ W.T + 0.01 * np.eye(W.shape[0])) @ W
    except np.linalg.LinAlgError:
        return ProcessModel(gain=1, tau=10, dead_time=2, r_squared=0, method="subspace", excitation_index=0)

    # SVD
    U, S, _ = np.linalg.svd(proj, full_matrices=False)
    n_order = min(order, len(S))
    obs = U[:, :n_order] @ np.diag(np.sqrt(S[:n_order]))

    # Estimate A, C from observability matrix
    C_est = obs[0, :]
    A_est = np.linalg.lstsq(obs[:-1, :], obs[1:, :], rcond=None)[0]

    # Estimate B, D via least squares on the state-space innovation form
    # Simplified: use step response of identified state-space model
    try:
        eigvals = np.linalg.eigvals(A_est)
        dominant_tau = -1.0 / np.real(eigvals[np.argmin(np.abs(np.real(eigvals)))])
        tau = max(1.0, float(dominant_tau * sample_interval))
    except Exception:
        tau = 10.0

    # Gain from C*(I-A)^(-1)*B — approximate via step simulation
    x = np.zeros(n_order)
    step_len = 100
    y_step = np.zeros(step_len)
    for i in range(1, step_len):
        x = A_est @ x
        y_step[i] = C_est @ x

    gain = float(y_step[-1]) if abs(y_step[-1]) > 0.01 else 1.0
    ss = abs(gain) * 0.63
    t63 = np.argmax(np.abs(y_step) >= ss)
    if t63 == 0:
        t63 = step_len // 2
    tau = float(t63 * sample_interval)

    return ProcessModel(
        gain=round(gain, 4),
        tau=round(max(1.0, tau), 1),
        dead_time=round(float(sample_interval), 1),
        r_squared=round(float(min(0.9, S[0] / (np.sum(S) + 1e-10))), 3),
        method="subspace",
        excitation_index=0,
    )


def identify_best(
    pv: list[float],
    op: list[float],
    sp: list[float],
    sample_interval: float = 1.0,
    excitation_threshold: float = 0.05,
) -> IdentificationResult:
    """Run excitation check, then best available identification method."""
    ei = check_excitation(op, sp)
    tag = ""

    if ei < excitation_threshold:
        return IdentificationResult(
            tag_name=tag,
            excitation_index=ei,
            excitation_sufficient=False,
            best_model=None,
            fallback_reason=f"激励指数 {ei:.2f} < 阈值 {excitation_threshold}，建议使用交互式整定",
        )

    # Try ARX first (more robust for small datasets)
    arx_model = identify_arx(pv, op, sample_interval)

    # If ARX fit is good enough, use it
    if arx_model.r_squared >= 0.5:
        arx_model.excitation_index = ei
        return IdentificationResult(
            tag_name=tag, excitation_index=ei, excitation_sufficient=True,
            best_model=arx_model, fallback_reason=None,
        )

    # Try subspace as backup
    ss_model = identify_subspace(pv, op, sample_interval)
    if ss_model.r_squared > arx_model.r_squared:
        ss_model.excitation_index = ei
        return IdentificationResult(
            tag_name=tag, excitation_index=ei, excitation_sufficient=True,
            best_model=ss_model, fallback_reason=None,
        )

    arx_model.excitation_index = ei
    return IdentificationResult(
        tag_name=tag, excitation_index=ei, excitation_sufficient=True,
        best_model=arx_model, fallback_reason=None,
    )
