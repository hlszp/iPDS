"""Production domain APIs for data sources and snapshots."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..models.production import (
    AssessmentSnapshot,
    AuditEvent,
    DataSource,
    DiagnosisSnapshot,
    FeatureEntitlement,
    IngestWatermark,
    LoopSignalBinding,
    OutcomeSnapshot,
    RecommendationAction,
    RecommendationSnapshot,
    TuningSnapshot,
)
from ..models.production_api import (
    DataSourceResponse,
    IngestWatermarkResponse,
    LoopSignalBindingResponse,
    OutcomeSnapshotResponse,
    RecommendationActionResponse,
    RecommendationSnapshotResponse,
    RuntimeSourceStatusResponse,
    RuntimeSourceUpdateRequest,
    SnapshotResponse,
)
from ..services.audit import record_audit_event
from ..services.snapshots import persist_outcome_snapshot, persist_recommendation_action, update_recommendation_status

router = APIRouter(prefix="/api/production", tags=["production"])


@router.get("/data-sources", response_model=list[DataSourceResponse])
def list_data_sources(db: Session = Depends(get_db)):
    return db.query(DataSource).order_by(DataSource.name.asc()).all()


@router.get("/runtime-source", response_model=RuntimeSourceStatusResponse)
def get_runtime_source(db: Session = Depends(get_db)):
    snapshot = get_runtime_source_manager().get_status_snapshot(db=db)
    return RuntimeSourceStatusResponse(**snapshot.__dict__)


@router.put("/runtime-source", response_model=RuntimeSourceStatusResponse)
def update_runtime_source(payload: RuntimeSourceUpdateRequest, actor: str = "system", db: Session = Depends(get_db)):
    manager = get_runtime_source_manager()
    try:
        manager.set_mode(payload.source, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    record_audit_event(
        db,
        event_type="runtime_source_updated",
        actor=actor,
        target_type="runtime_source",
        target_id="system",
        payload_json={"source": payload.source},
    )
    db.commit()
    snapshot = manager.get_status_snapshot(db=db)
    return RuntimeSourceStatusResponse(**snapshot.__dict__)


@router.post("/runtime-source/validate", response_model=RuntimeSourceStatusResponse)
def validate_runtime_source(db: Session = Depends(get_db)):
    snapshot = get_runtime_source_manager().get_status_snapshot(db=db)
    return RuntimeSourceStatusResponse(**snapshot.__dict__)


@router.get("/feature-entitlements")
def list_feature_entitlements(db: Session = Depends(get_db)):
    rows = db.query(FeatureEntitlement).order_by(FeatureEntitlement.deployment_key.asc(), FeatureEntitlement.feature_key.asc()).all()
    return [
        {
            "id": row.id,
            "deployment_key": row.deployment_key,
            "feature_key": row.feature_key,
            "enabled": row.enabled,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.post("/feature-entitlements")
def upsert_feature_entitlement(deployment_key: str, feature_key: str, enabled: bool, actor: str = "system", db: Session = Depends(get_db)):
    row = db.query(FeatureEntitlement).filter(
        FeatureEntitlement.deployment_key == deployment_key,
        FeatureEntitlement.feature_key == feature_key,
    ).first()
    if not row:
        row = FeatureEntitlement(deployment_key=deployment_key, feature_key=feature_key, enabled=enabled)
        db.add(row)
    else:
        row.enabled = enabled
    db.flush()
    record_audit_event(
        db,
        event_type="feature_entitlement_updated",
        actor=actor,
        target_type="feature_entitlement",
        target_id=f"{deployment_key}:{feature_key}",
        payload_json={"enabled": enabled},
    )
    db.commit()
    return {"deployment_key": deployment_key, "feature_key": feature_key, "enabled": enabled}


@router.get("/audit-events")
def list_audit_events(db: Session = Depends(get_db)):
    rows = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(200).all()
    return [
        {
            "event_id": row.event_id,
            "event_type": row.event_type,
            "actor": row.actor,
            "target_type": row.target_type,
            "target_id": row.target_id,
            "payload_json": row.payload_json,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/loop-signal-bindings/{loop_tag_id}", response_model=list[LoopSignalBindingResponse])
def list_loop_signal_bindings(loop_tag_id: int, db: Session = Depends(get_db)):
    return db.query(LoopSignalBinding).filter(LoopSignalBinding.loop_tag_id == loop_tag_id).order_by(LoopSignalBinding.signal_type.asc()).all()


@router.get("/ingest-watermarks/{loop_tag_id}", response_model=list[IngestWatermarkResponse])
def list_ingest_watermarks(loop_tag_id: int, db: Session = Depends(get_db)):
    return db.query(IngestWatermark).filter(IngestWatermark.loop_tag_id == loop_tag_id).order_by(IngestWatermark.updated_at.desc()).all()


@router.get("/snapshots/assessment/{loop_tag_id}", response_model=list[SnapshotResponse])
def list_assessment_snapshots(loop_tag_id: int, db: Session = Depends(get_db)):
    rows = db.query(AssessmentSnapshot).filter(AssessmentSnapshot.loop_tag_id == loop_tag_id).order_by(AssessmentSnapshot.created_at.desc()).all()
    return [SnapshotResponse(id=row.id, snapshot_id=row.snapshot_id, loop_tag_id=row.loop_tag_id, created_at=row.created_at, payload=row.metrics_json) for row in rows]


@router.get("/snapshots/diagnosis/{loop_tag_id}", response_model=list[SnapshotResponse])
def list_diagnosis_snapshots(loop_tag_id: int, db: Session = Depends(get_db)):
    rows = db.query(DiagnosisSnapshot).filter(DiagnosisSnapshot.loop_tag_id == loop_tag_id).order_by(DiagnosisSnapshot.created_at.desc()).all()
    return [SnapshotResponse(id=row.id, snapshot_id=row.snapshot_id, loop_tag_id=row.loop_tag_id, created_at=row.created_at, payload=row.details_json) for row in rows]


@router.get("/snapshots/tuning/{loop_tag_id}", response_model=list[SnapshotResponse])
def list_tuning_snapshots(loop_tag_id: int, db: Session = Depends(get_db)):
    rows = db.query(TuningSnapshot).filter(TuningSnapshot.loop_tag_id == loop_tag_id).order_by(TuningSnapshot.created_at.desc()).all()
    return [SnapshotResponse(id=row.id, snapshot_id=row.snapshot_id, loop_tag_id=row.loop_tag_id, created_at=row.created_at, payload=row.details_json) for row in rows]


@router.get("/snapshots/recommendations/{loop_tag_id}", response_model=list[RecommendationSnapshotResponse])
def list_recommendation_snapshots(loop_tag_id: int, db: Session = Depends(get_db)):
    return db.query(RecommendationSnapshot).filter(RecommendationSnapshot.loop_tag_id == loop_tag_id).order_by(RecommendationSnapshot.created_at.desc()).all()


@router.get("/snapshots/recommendation/{recommendation_id}", response_model=RecommendationSnapshotResponse)
def get_recommendation_snapshot(recommendation_id: str, db: Session = Depends(get_db)):
    row = db.query(RecommendationSnapshot).filter(RecommendationSnapshot.recommendation_id == recommendation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="recommendation not found")
    return row


@router.get("/recommendations/{recommendation_id}/actions", response_model=list[RecommendationActionResponse])
def list_recommendation_actions(recommendation_id: str, db: Session = Depends(get_db)):
    recommendation = db.query(RecommendationSnapshot).filter(RecommendationSnapshot.recommendation_id == recommendation_id).first()
    if not recommendation:
        raise HTTPException(status_code=404, detail="recommendation not found")
    return db.query(RecommendationAction).filter(RecommendationAction.recommendation_snapshot_id == recommendation.id).order_by(RecommendationAction.created_at.asc()).all()


@router.post("/recommendations/{recommendation_id}/actions", response_model=RecommendationActionResponse)
def create_recommendation_action(recommendation_id: str, action_type: str, actor: str, comment: str = "", db: Session = Depends(get_db)):
    recommendation = db.query(RecommendationSnapshot).filter(RecommendationSnapshot.recommendation_id == recommendation_id).first()
    if not recommendation:
        raise HTTPException(status_code=404, detail="recommendation not found")
    row = persist_recommendation_action(db, recommendation.id, action_type=action_type, actor=actor, comment=comment or None)
    if action_type in {"approve", "adopt"}:
        update_recommendation_status(db, recommendation, "approved")
    elif action_type in {"reject", "ignore"}:
        update_recommendation_status(db, recommendation, "rejected")
    elif action_type in {"verify", "observe"}:
        update_recommendation_status(db, recommendation, "validation_pending")
    record_audit_event(
        db,
        event_type="recommendation_action",
        actor=actor,
        target_type="recommendation",
        target_id=recommendation.recommendation_id,
        payload_json={"action_type": action_type, "comment": comment},
    )
    db.commit()
    return row


@router.get("/recommendations/{recommendation_id}/outcomes", response_model=list[OutcomeSnapshotResponse])
def list_outcomes(recommendation_id: str, db: Session = Depends(get_db)):
    recommendation = db.query(RecommendationSnapshot).filter(RecommendationSnapshot.recommendation_id == recommendation_id).first()
    if not recommendation:
        raise HTTPException(status_code=404, detail="recommendation not found")
    return db.query(OutcomeSnapshot).filter(OutcomeSnapshot.recommendation_snapshot_id == recommendation.id).order_by(OutcomeSnapshot.created_at.desc()).all()


@router.post("/recommendations/{recommendation_id}/outcomes", response_model=OutcomeSnapshotResponse)
def create_outcome(recommendation_id: str, before_snapshot_id: int, after_snapshot_id: int, actor: str = "system", db: Session = Depends(get_db)):
    recommendation = db.query(RecommendationSnapshot).filter(RecommendationSnapshot.recommendation_id == recommendation_id).first()
    if not recommendation:
        raise HTTPException(status_code=404, detail="recommendation not found")
    before_snapshot = db.query(AssessmentSnapshot).filter(AssessmentSnapshot.id == before_snapshot_id).first()
    after_snapshot = db.query(AssessmentSnapshot).filter(AssessmentSnapshot.id == after_snapshot_id).first()
    if not before_snapshot or not after_snapshot:
        raise HTTPException(status_code=404, detail="assessment snapshot not found")
    before_score = float(before_snapshot.performance_score)
    after_score = float(after_snapshot.performance_score)
    row = persist_outcome_snapshot(
        db,
        recommendation.id,
        before_snapshot_id,
        after_snapshot_id,
        delta_json={
            "before_score": before_score,
            "after_score": after_score,
            "delta_score": round(after_score - before_score, 2),
            "before_grade": before_snapshot.grade,
            "after_grade": after_snapshot.grade,
        },
    )
    update_recommendation_status(db, recommendation, "validated")
    record_audit_event(
        db,
        event_type="outcome_recorded",
        actor=actor,
        target_type="recommendation",
        target_id=recommendation.recommendation_id,
        payload_json=row.delta_json,
    )
    db.commit()
    return row
