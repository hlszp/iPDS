"""Unit tests for the assessment engine — KPI scoring and grading logic."""

import math
from app.services.assessment.engine import LoopAssessment, assess_loop, detect_trend


def _fake_data(n, base_pv=50, noise=0.5):
    pv = [base_pv + math.sin(i * 0.1) * noise for i in range(n)]
    sp = [base_pv] * n
    op = [50.0] * n
    mode = ["AUTO"] * n
    return pv, sp, op, mode


def test_assess_empty_input():
    a = assess_loop([], [], [], [], tag_name="X", unit="test")
    assert a.grade == "开环"
    assert a.performance_score == 0


def test_assess_short_input():
    pv, sp, op, mode = _fake_data(3)
    a = assess_loop(pv, sp, op, mode, tag_name="X", unit="test")
    assert a.grade == "开环"
    assert a.performance_score == 0


def test_assess_well_behaved():
    pv, sp, op, mode = _fake_data(200, base_pv=50, noise=0.2)
    a = assess_loop(pv, sp, op, mode, tag_name="GOOD", unit="test")
    assert a.grade in ("优", "良", "中")
    assert 50 <= a.performance_score <= 100
    assert 0 <= a.accuracy_rate <= 100
    assert 0 <= a.fast_rate <= 100
    assert 0 <= a.effective_auto_rate <= 100


def test_assess_full_bad():
    pv = [50 + (i % 10) * 5 for i in range(200)]
    sp = [50] * 200
    op = [100 - i % 40 for i in range(200)]
    mode = ["MANUAL"] * 200
    a = assess_loop(pv, sp, op, mode, tag_name="BAD", unit="test")
    assert a.grade in ("差", "开环")
    assert a.performance_score <= 60


def test_assess_loop_category_changes_score_weights():
    pv, sp, op, mode = _fake_data(200, base_pv=50, noise=0.8)
    fast = assess_loop(pv, sp, op, mode, loop_category="快速型")
    slow = assess_loop(pv, sp, op, mode, loop_category="慢速型")
    assert fast.performance_score != slow.performance_score


def test_assess_logic_loop_keeps_score_in_range():
    pv, sp, op, mode = _fake_data(200, base_pv=50, noise=0.4)
    a = assess_loop(pv, sp, op, mode, loop_category="逻辑型")
    assert 0 <= a.performance_score <= 100


def test_detect_trend_empty():
    assert detect_trend([]) == []


def test_detect_trend_declining():
    history = []
    for i in range(7):
        history.append(LoopAssessment(
            "T1", "test", self_control_rate=90.0,
            stability_rate=90.0 - i * 3, performance_score=85.0 - i * 3,
            accuracy_rate=80.0 - i * 2, fast_rate=75.0 - i * 2, effective_auto_rate=90.0,
            grade="良", iae=0.01 + i * 0.005, oscillation_index=0.1 + i * 0.02,
            oscillation_period=None, valve_saturation_rate=0.0,
            operation_frequency=0.0, nonlinearity_degree=0.0, reference_time="2026-05",
        ))
    alerts = detect_trend(history, window_days=7)
    assert len(alerts) >= 1
    assert alerts[0].metric in ("平稳率", "性能评分")
