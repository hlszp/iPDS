"""Smoke tests for diagnosis engine."""
import math
from app.services.diagnosis.engine import diagnose_loop


def _fake_data(n, base_pv=50, base_op=50, noise=0.3):
    pv = [base_pv + math.sin(i * 0.1) * noise for i in range(n)]
    sp = [base_pv] * n
    op = [base_op + math.cos(i * 0.08) * 2 for i in range(n)]
    return pv, sp, op


def test_diagnose_short_input():
    r = diagnose_loop("SHORT", [1, 2, 3], [1, 2, 3], [1, 2, 3])
    assert r.primary_fault == "none"
    assert r.stiction_confidence == 0


def test_diagnose_normal_input():
    pv, sp, op = _fake_data(200)
    r = diagnose_loop("NORMAL", pv, sp, op)
    assert r.tag_name == "NORMAL"
    assert 0 <= r.stiction_confidence <= 1
    assert r.primary_fault in ("stiction", "oscillation", "nonlinearity", "coupling", "none")


def test_diagnose_oscillatory():
    pv = [50 + math.sin(i * 0.5) * 8 for i in range(300)]
    sp = [50] * 300
    op = [60] * 300
    r = diagnose_loop("OSC", pv, sp, op)
    assert r.oscillation_detected or r.oscillation_confidence > 0.1


def test_diagnose_neighbor_data_noop():
    pv, sp, op = _fake_data(200)
    r = diagnose_loop("N", pv, sp, op, neighbor_data={"OTHER": (pv, op)})
    assert 0 <= r.coupling_strength <= 1
