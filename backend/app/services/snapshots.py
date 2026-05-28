"""Analytics snapshot persistence helpers."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.production import (
    AssessmentSnapshot,
    DiagnosisSnapshot,
    IdentificationSnapshot,
    OutcomeSnapshot,
    RecommendationAction,
    RecommendationSnapshot,
    TuningSnapshot,
)
from ..services.assessment.engine import LoopAssessment
from ..services.diagnosis.engine import DiagnosisResult
from ..services.identification.engine import IdentificationResult
from ..services.simulation.engine import SimulationResult
from ..services.tuning.engine import PIDParams


def persist_assessment_snapshot(
    db: Session,
    loop_tag_id: int,
    assessment: LoopAssessment,
    window_start: datetime,
    window_end: datetime,
) -> AssessmentSnapshot:
    row = AssessmentSnapshot(
        snapshot_id=_snapshot_id("asmt"),
        loop_tag_id=loop_tag_id,
        window_start=window_start,
        window_end=window_end,
        performance_score=assessment.performance_score,
        grade=assessment.grade,
        engine_version="v1",
        metrics_json={
            "tag_name": assessment.tag_name,
            "unit": assessment.unit,
            "self_control_rate": assessment.self_control_rate,
            "stability_rate": assessment.stability_rate,
            "accuracy_rate": assessment.accuracy_rate,
            "fast_rate": assessment.fast_rate,
            "effective_auto_rate": assessment.effective_auto_rate,
            "iae": assessment.iae,
            "oscillation_index": assessment.oscillation_index,
            "oscillation_period": assessment.oscillation_period,
            "valve_saturation_rate": assessment.valve_saturation_rate,
            "operation_frequency": assessment.operation_frequency,
            "nonlinearity_degree": assessment.nonlinearity_degree,
            "reference_time": assessment.reference_time,
        },
    )
    db.add(row)
    db.flush()
    return row


def persist_diagnosis_snapshot(
    db: Session,
    loop_tag_id: int,
    diagnosis: DiagnosisResult,
    window_start: datetime,
    window_end: datetime,
) -> DiagnosisSnapshot:
    confidence = max(
        diagnosis.stiction_confidence if diagnosis.stiction_detected else 0,
        diagnosis.oscillation_confidence if diagnosis.oscillation_detected else 0,
        diagnosis.nonlinearity_degree if diagnosis.nonlinearity_detected else 0,
        diagnosis.coupling_strength if diagnosis.coupling_candidates else 0,
    )
    row = DiagnosisSnapshot(
        snapshot_id=_snapshot_id("diag"),
        loop_tag_id=loop_tag_id,
        window_start=window_start,
        window_end=window_end,
        primary_fault=diagnosis.primary_fault,
        confidence=confidence,
        details_json={
            "stiction_detected": diagnosis.stiction_detected,
            "stiction_confidence": diagnosis.stiction_confidence,
            "oscillation_detected": diagnosis.oscillation_detected,
            "oscillation_period": diagnosis.oscillation_period,
            "oscillation_confidence": diagnosis.oscillation_confidence,
            "nonlinearity_detected": diagnosis.nonlinearity_detected,
            "nonlinearity_degree": diagnosis.nonlinearity_degree,
            "coupling_candidates": diagnosis.coupling_candidates,
            "coupling_strength": diagnosis.coupling_strength,
            "settling_time": diagnosis.settling_time,
            "travel_index": diagnosis.travel_index,
            "good_rate": diagnosis.good_rate,
        },
    )
    db.add(row)
    db.flush()
    return row


def persist_identification_snapshot(
    db: Session,
    loop_tag_id: int,
    identification: IdentificationResult,
    window_start: datetime,
    window_end: datetime,
) -> IdentificationSnapshot:
    model = identification.best_model
    row = IdentificationSnapshot(
        snapshot_id=_snapshot_id("idn"),
        loop_tag_id=loop_tag_id,
        window_start=window_start,
        window_end=window_end,
        gain=float(model.gain),
        tau=float(model.tau),
        dead_time=float(model.dead_time),
        r_squared=float(model.r_squared),
        details_json={
            "method": model.method,
            "excitation_index": float(identification.excitation_index),
            "excitation_sufficient": bool(identification.excitation_sufficient),
            "fallback_reason": identification.fallback_reason,
        },
    )
    db.add(row)
    db.flush()
    return row


def persist_tuning_snapshot(
    db: Session,
    loop_tag_id: int,
    pid_params: PIDParams,
    simulation: SimulationResult,
) -> TuningSnapshot:
    row = TuningSnapshot(
        snapshot_id=_snapshot_id("tune"),
        loop_tag_id=loop_tag_id,
        method=pid_params.method,
        kc=pid_params.Kc,
        ti=pid_params.Ti,
        td=pid_params.Td,
        confidence=simulation.confidence_score,
        details_json={
            "closed_loop_tau": pid_params.closed_loop_tau,
            "settling_time": simulation.settling_time,
            "overshoot_pct": simulation.overshoot_pct,
            "rise_time": simulation.rise_time,
            "steady_state_error": simulation.steady_state_error,
            "gain_margin_db": simulation.gain_margin_db,
            "phase_margin_deg": simulation.phase_margin_deg,
            "confidence_level": simulation.confidence_level,
            "recommendation": simulation.recommendation,
        },
    )
    db.add(row)
    db.flush()
    return row


def persist_recommendation_snapshot(
    db: Session,
    loop_tag_id: int,
    assessment_snapshot_id: int,
    diagnosis_snapshot_id: int,
    tuning_snapshot_id: int,
    risk_level: str,
    summary_json: dict,
) -> RecommendationSnapshot:
    row = RecommendationSnapshot(
        recommendation_id=_snapshot_id("reco"),
        loop_tag_id=loop_tag_id,
        assessment_snapshot_id=assessment_snapshot_id,
        diagnosis_snapshot_id=diagnosis_snapshot_id,
        tuning_snapshot_id=tuning_snapshot_id,
        risk_level=risk_level,
        status="pending_review",
        summary_json=summary_json,
    )
    db.add(row)
    db.flush()
    return row


def persist_recommendation_action(
    db: Session,
    recommendation_snapshot_id: int,
    action_type: str,
    actor: str,
    comment: Optional[str] = None,
) -> RecommendationAction:
    row = RecommendationAction(
        recommendation_snapshot_id=recommendation_snapshot_id,
        action_type=action_type,
        actor=actor,
        comment=comment,
    )
    db.add(row)
    db.flush()
    return row


def persist_outcome_snapshot(
    db: Session,
    recommendation_snapshot_id: int,
    before_snapshot_id: int,
    after_snapshot_id: int,
    delta_json: dict,
) -> OutcomeSnapshot:
    row = OutcomeSnapshot(
        recommendation_snapshot_id=recommendation_snapshot_id,
        before_snapshot_id=before_snapshot_id,
        after_snapshot_id=after_snapshot_id,
        delta_json=delta_json,
    )
    db.add(row)
    db.flush()
    return row


def update_recommendation_status(
    db: Session,
    recommendation: RecommendationSnapshot,
    status: str,
) -> RecommendationSnapshot:
    recommendation.status = status
    db.add(recommendation)
    db.flush()
    return recommendation


def _snapshot_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"
