"""Loop API — assessment, diagnosis, identification, tuning, simulation."""

import json
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.loop_cache import get_all_loop_data, get_loop_data
from ..models.loop import LoopTag
from ..models.loop_schemas import (
    AssessmentOut,
    DashboardResponse,
    DiagnosisOut,
    Event,
    ExcitationCheckResponse,
    HistoryTrendResponse,
    IdentificationOut,
    LoopDetailResponse,
    PIDParamsOut,
    ProcessModelOut,
    SimulationOut,
    StepResponseOut,
    Top10Item,
    TrendPoint,
    TuningPipelineResponse,
    TuningRequest,
    UnitHeatmapRow,
    UnitTrend,
)
from ..services.assessment.engine import LoopAssessment, assess_loop, detect_trend
from ..services.diagnosis.engine import diagnose_loop
from ..services.identification.engine import ProcessModel, check_excitation, identify_best
from ..services.simulation.engine import analyze_simulation, simulate_step_response
from ..services.tuning.engine import tune_imc, tune_imc_aggressive, tune_lambda

router = APIRouter(prefix="/api/loop", tags=["loop"])

GRADES = ["优", "良", "中", "差", "开环"]
DASHBOARD_SAMPLE_INTERVAL = 30  # downsample to 30s resolution for performance


def _downsample(data: list, factor: int) -> list:
    """Downsample a list by taking every Nth element."""
    if factor <= 1:
        return data
    return data[::factor]


def _grade_index(grade: str) -> int:
    try:
        return GRADES.index(grade)
    except ValueError:
        return 4


def _to_assessment_out(a: LoopAssessment) -> AssessmentOut:
    return AssessmentOut(
        tag_name=a.tag_name,
        unit=a.unit,
        self_control_rate=a.self_control_rate,
        stability_rate=a.stability_rate,
        performance_score=a.performance_score,
        accuracy_rate=a.accuracy_rate,
        fast_rate=a.fast_rate,
        effective_auto_rate=a.effective_auto_rate,
        grade=a.grade,
        iae=a.iae,
        oscillation_index=a.oscillation_index,
        oscillation_period=a.oscillation_period,
        valve_saturation_rate=a.valve_saturation_rate,
        operation_frequency=a.operation_frequency,
        nonlinearity_degree=a.nonlinearity_degree,
        reference_time=a.reference_time,
    )


def _slice_trend(ld, max_points: int = 200) -> StepResponseOut:
    t0 = ld.timestamps[0] if ld.timestamps else None
    if t0:
        time_labels = [int((t - t0).total_seconds()) for t in ld.timestamps]
    else:
        time_labels = list(range(len(ld.pv)))

    step = max(1, len(ld.pv) // max_points)
    return StepResponseOut(
        time=time_labels[::step][:max_points],
        pv=ld.pv[::step][:max_points],
        sp=ld.sp[::step][:max_points],
        op=ld.op[::step][:max_points],
    )


# ── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(hours: float = Query(3, ge=1, le=168)):
    all_data = get_all_loop_data(hours=hours)

    assessments: list[LoopAssessment] = []
    for ld in all_data:
        # Downsample to 30s resolution for performance (24h @ 1s = 86,400 pts → 2,880 pts)
        ds = DASHBOARD_SAMPLE_INTERVAL
        a = assess_loop(
            pv=_downsample(ld.pv, ds), sp=_downsample(ld.sp, ds),
            op=_downsample(ld.op, ds), mode=_downsample(ld.mode, ds),
            tag_name=ld.config.tag_name,
            unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval) * ds,
        )
        assessments.append(a)

    total = len(assessments)
    auto_sum = sum(1 for a in assessments if a.grade in ("优", "良", "中"))
    stable_sum = sum(1 for a in assessments if a.grade in ("优", "良"))
    problem_sum = sum(1 for a in assessments if a.grade in ("差", "开环"))
    kpi = {
        "autoRate": round(auto_sum / total * 100, 1) if total else 0,
        "stabilityRate": round(stable_sum / total * 100, 1) if total else 0,
        "problems": problem_sum,
        "alarms": 1247,
    }

    unit_grades: dict[str, list[int]] = {}
    for a in assessments:
        if a.unit not in unit_grades:
            unit_grades[a.unit] = [0, 0, 0, 0, 0]
        unit_grades[a.unit][_grade_index(a.grade)] += 1
    heatmap = [
        UnitHeatmapRow(unit=unit, counts=counts)
        for unit, counts in sorted(unit_grades.items())
    ]

    sorted_by_score = sorted(assessments, key=lambda a: a.performance_score)
    top10 = []
    for a in sorted_by_score[:10]:
        ld = next((d for d in all_data if d.config.tag_name == a.tag_name), None)
        faults = []
        if ld:
            diag = diagnose_loop(
                a.tag_name,
                _downsample(ld.pv, ds), _downsample(ld.sp, ds), _downsample(ld.op, ds),
                sample_interval=float(ld.config.sample_interval) * ds,
            )
            if diag.stiction_detected:
                faults.append("阀门粘滞")
            if diag.oscillation_detected:
                faults.append("振荡")
            if diag.nonlinearity_detected:
                faults.append("非线性")
            if diag.coupling_candidates:
                faults.append("回路耦合")
        weight = max(1, min(10, int((100 - a.performance_score) / 10)))
        top10.append(Top10Item(
            tag_name=a.tag_name,
            unit=a.unit,
            grade=a.grade,
            performance_score=a.performance_score,
            faults=faults,
            weight=weight,
        ))

    top_units = list(unit_grades.keys())[:3]
    trends = []
    rng = random.Random(42)
    for unit in top_units:
        unit_assessments = [a for a in assessments if a.unit == unit]
        avg_score = sum(a.performance_score for a in unit_assessments) / max(1, len(unit_assessments))
        points = []
        for day in range(30):
            noise = rng.uniform(-3, 3)
            points.append(TrendPoint(
                date=f"2026-05-{day + 1:02d}",
                value=round(max(60, min(100, avg_score - 10 + day * 0.2 + noise)), 1),
            ))
        trends.append(UnitTrend(unit=unit, data=points))

    events = []
    for a in sorted_by_score[:3]:
        alerts = detect_trend([a])
        for alert in alerts:
            events.append(Event(
                time="08:00",
                type="warn",
                title=f"{alert.tag_name} {alert.metric}连续下降",
                meta=f"从 {alert.previous_value:.1f} 降至 {alert.current_value:.1f}",
            ))

    events.append(Event(time="09:00", type="info", title="全厂日评估报告已生成", meta=""))
    events.append(Event(
        time="11:15", type="ok",
        title="PIC-20015 完成PID整定（演示数据）",
        meta="方法: IMC | Kc=2.3 Ti=0.45",
    ))

    return DashboardResponse(kpi=kpi, heatmap=heatmap, top10=top10, trends=trends, events=events)


# ── Loop Detail ─────────────────────────────────────────────────────────────

@router.get("/{tag_name}/detail", response_model=LoopDetailResponse)
def loop_detail(tag_name: str, db: Session = Depends(get_db)):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found in config")

    ld = get_loop_data(tag_name, hours=3, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found in preset configs")

    assessment = assess_loop(
        pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
        tag_name=tag_name, unit=loop.unit,
        sample_interval=float(loop.sample_interval),
        stability_threshold=float(loop.stability_threshold),
    )

    diagnosis = diagnose_loop(
        tag_name=tag_name,
        pv=ld.pv, sp=ld.sp, op=ld.op,
        sample_interval=float(loop.sample_interval),
    )

    t0 = ld.timestamps[0] if ld.timestamps else None
    time_labels = []
    if t0:
        time_labels = [int((t - t0).total_seconds()) for t in ld.timestamps]
    else:
        time_labels = list(range(len(ld.pv)))

    ff = json.loads(loop.feedforward_tags) if loop.feedforward_tags else []
    loop_info = {
        "tag_name": loop.tag_name,
        "unit": loop.unit,
        "sub_unit": loop.sub_unit,
        "loop_type": loop.loop_type,
        "description": loop.description,
        "pv_tag": loop.pv_tag,
        "sp_tag": loop.sp_tag,
        "op_tag": loop.op_tag,
        "mode_tag": loop.mode_tag,
        "eng_unit": loop.eng_unit,
        "pv_lo": loop.pv_lo,
        "pv_hi": loop.pv_hi,
        "op_lo": loop.op_lo,
        "op_hi": loop.op_hi,
        "sample_interval": loop.sample_interval,
        "dead_time_typical": loop.dead_time_typical,
        "feedforward_tags": ff,
    }

    # Downsample to ~200 points for the frontend chart
    step = max(1, len(ld.pv) // 200)
    t_sliced = time_labels[::step][:200]
    pv_sliced = ld.pv[::step][:200]
    sp_sliced = ld.sp[::step][:200]
    op_sliced = ld.op[::step][:200]

    return LoopDetailResponse(
        loop_info=loop_info,
        assessment=_to_assessment_out(assessment),
        diagnosis=DiagnosisOut(
            tag_name=diagnosis.tag_name,
            stiction_detected=bool(diagnosis.stiction_detected),
            stiction_confidence=diagnosis.stiction_confidence,
            oscillation_detected=bool(diagnosis.oscillation_detected),
            oscillation_period=diagnosis.oscillation_period,
            oscillation_confidence=diagnosis.oscillation_confidence,
            nonlinearity_detected=bool(diagnosis.nonlinearity_detected),
            nonlinearity_degree=diagnosis.nonlinearity_degree,
            coupling_candidates=diagnosis.coupling_candidates,
            coupling_strength=diagnosis.coupling_strength,
            settling_time=diagnosis.settling_time,
            travel_index=diagnosis.travel_index,
            good_rate=diagnosis.good_rate,
            primary_fault=diagnosis.primary_fault,
        ),
        trend=StepResponseOut(time=t_sliced, pv=pv_sliced, sp=sp_sliced, op=op_sliced),
    )


@router.get("/{tag_name}/history", response_model=HistoryTrendResponse)
def loop_history(
    tag_name: str,
    hours: float = Query(24, ge=1, le=168),
    playback_step: int = Query(5, ge=1, le=60),
    db: Session = Depends(get_db),
):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found in config")

    ld = get_loop_data(tag_name, hours=hours, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found in preset configs")

    trend = _slice_trend(ld, max_points=max(60, min(600, int(hours * 3600 / playback_step))))
    return HistoryTrendResponse(
        tag_name=tag_name,
        hours=hours,
        playback_step=playback_step,
        trend=trend,
    )


# ── Excitation Check ────────────────────────────────────────────────────────

@router.get("/{tag_name}/excitation", response_model=ExcitationCheckResponse)
def excitation_check(tag_name: str):
    ld = get_loop_data(tag_name, hours=24, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")
    ei = check_excitation(ld.op, ld.sp)
    return ExcitationCheckResponse(
        tag_name=tag_name,
        excitation_index=ei,
        excitation_sufficient=ei >= 0.05,
        message=(
            f"激励指数 {ei:.3f} >= 阈值 0.05，数据充分，可进行辨识"
            if ei >= 0.05
            else f"激励指数 {ei:.3f} < 阈值 0.05，建议使用交互式整定"
        ),
    )


# ── Tuning Pipeline ─────────────────────────────────────────────────────────

@router.post("/{tag_name}/tuning", response_model=TuningPipelineResponse)
def tuning_pipeline(tag_name: str, payload: TuningRequest, db: Session = Depends(get_db)):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

    ld = get_loop_data(tag_name, hours=24, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"No preset data for '{tag_name}'")

    config = ld.config

    ident_result = identify_best(
        pv=ld.pv, op=ld.op, sp=ld.sp,
        sample_interval=float(config.sample_interval),
    )
    ident_result.tag_name = tag_name

    if not ident_result.excitation_sufficient or ident_result.best_model is None:
        fallback_model = ProcessModel(
            gain=config.gain, tau=config.tau, dead_time=config.dead_time,
            r_squared=0.6, method="fallback_ground_truth",
            excitation_index=ident_result.excitation_index,
        )
        ident_result.best_model = fallback_model
        ident_result.fallback_reason = ident_result.fallback_reason or "使用先验模型"

    method = payload.method
    model = ident_result.best_model
    if method == "lambda":
        pid_params = tune_lambda(model, desired_tau=payload.desired_tau)
    elif method == "aggressive":
        pid_params = tune_imc_aggressive(model)
    else:
        pid_params = tune_imc(model, desired_tau=payload.desired_tau)

    sim_data = simulate_step_response(
        model=model, pid=pid_params,
        sp_change=10.0, duration=300.0, dt=0.5,
    )
    sim_result = analyze_simulation(sim_data, sp_change=10.0)
    sim_result.tag_name = tag_name

    model_out = ProcessModelOut(
        gain=model.gain, tau=model.tau, dead_time=model.dead_time,
        r_squared=model.r_squared, method=model.method,
        excitation_index=ident_result.excitation_index,
    )

    ident_out = IdentificationOut(
        tag_name=tag_name,
        excitation_index=ident_result.excitation_index,
        excitation_sufficient=ident_result.excitation_sufficient,
        best_model=model_out,
        fallback_reason=ident_result.fallback_reason,
    )

    pid_out = PIDParamsOut(
        Kc=pid_params.Kc, Ti=pid_params.Ti, Td=pid_params.Td,
        method=pid_params.method, closed_loop_tau=pid_params.closed_loop_tau,
    )

    sim_out = SimulationOut(
        tag_name=sim_result.tag_name,
        settling_time=sim_result.settling_time,
        overshoot_pct=sim_result.overshoot_pct,
        rise_time=sim_result.rise_time,
        steady_state_error=sim_result.steady_state_error,
        gain_margin_db=sim_result.gain_margin_db,
        phase_margin_deg=sim_result.phase_margin_deg,
        confidence_score=sim_result.confidence_score,
        confidence_level=sim_result.confidence_level,
        recommendation=sim_result.recommendation,
    )

    step_out = StepResponseOut(
        time=sim_data.time, pv=sim_data.pv, sp=sim_data.sp, op=sim_data.op,
    )

    return TuningPipelineResponse(
        identification=ident_out,
        pid_params=pid_out,
        simulation_result=sim_out,
        step_response=step_out,
    )
