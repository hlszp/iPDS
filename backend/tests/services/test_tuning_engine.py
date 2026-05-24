"""Unit tests for PID tuning rules."""
from app.services.identification.engine import ProcessModel
from app.services.tuning.engine import PIDParams, tune_imc, tune_imc_aggressive, tune_lambda


def _model(K=1.5, tau=20.0, dead_time=3.0):
    return ProcessModel(gain=K, tau=tau, dead_time=dead_time, r_squared=0.8, method="test", excitation_index=0.1)


def test_imc_returns_pid_params():
    p = tune_imc(_model())
    assert isinstance(p, PIDParams)
    assert p.Kc > 0
    assert p.Ti > 0
    assert p.Td >= 0


def test_imc_gain_zero_clamped():
    p = tune_imc(_model(K=0.0001))
    assert p.Kc > 0
    assert p.Ti > 0


def test_imc_aggressive_lower_tau():
    p_std = tune_imc(_model())
    p_agg = tune_imc_aggressive(_model())
    assert p_agg.closed_loop_tau <= p_std.closed_loop_tau


def test_lambda_pi_only():
    p = tune_lambda(_model())
    assert p.Td == 0.0


def test_lambda_desired_tau_respected():
    p = tune_lambda(_model(), desired_tau=10.0)
    assert p.closed_loop_tau == 10.0
