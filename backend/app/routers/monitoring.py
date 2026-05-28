"""Monitoring API — real-time and historical KPI queries at all hierarchy levels."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..models.loop import LoopTag
from ..models.plant import Device
from ..models.production import MonitoringAggregateSnapshot
from ..services.assessment.engine import assess_loop

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

GRADES = ["优", "良", "中", "差", "开环"]
_HISTORY_DIMENSIONS = {"hour": 24, "day": 30, "month": 12}


def _build_loop_filter(plant_id, device_id, loop_group_id, db):
    """Return set of tag_names matching hierarchy filter."""
    if not plant_id and not device_id and not loop_group_id:
        return None
    q = db.query(LoopTag)
    if loop_group_id:
        q = q.filter(LoopTag.loop_group_id == loop_group_id)
    elif device_id:
        q = q.filter(LoopTag.device_id == device_id)
    elif plant_id:
        device_ids = [d.id for d in db.query(Device).filter(Device.plant_id == plant_id).all()]
        if device_ids:
            q = q.filter(LoopTag.device_id.in_(device_ids))
        else:
            q = q.filter(LoopTag.id.is_(None))
    return {lt.tag_name for lt in q.all()}


def _resolve_history_scope(plant_id, device_id, loop_group_id):
    if loop_group_id:
        return "loop_group", str(loop_group_id)
    if device_id:
        return "device", str(device_id)
    if plant_id:
        return "plant", str(plant_id)
    return "global", "all"


@router.get("/realtime")
def get_realtime(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    sort_by: str = Query("performance_score"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    """Return latest hourly stats for each loop."""
    query_result = get_runtime_source_manager().resolve_loop_data(db=db, hours=1, seed=42)
    all_data = query_result.loops
    loop_filter = _build_loop_filter(plant_id, device_id, loop_group_id, db)

    rows = []
    for ld in all_data:
        if loop_filter is not None and ld.config.tag_name not in loop_filter:
            continue
        a = assess_loop(
            pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
            tag_name=ld.config.tag_name, unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
        )
        rows.append({
            "tag_name": a.tag_name,
            "unit": a.unit,
            "self_control_rate": round(a.self_control_rate, 1),
            "stability_rate": round(a.stability_rate, 1),
            "performance_score": round(a.performance_score, 1),
            "grade": a.grade,
            "oscillation_index": round(a.oscillation_index, 3),
        })

    valid_sort = {"performance_score", "self_control_rate", "stability_rate", "tag_name"}
    key = sort_by if sort_by in valid_sort else "performance_score"
    reverse = sort_dir == "desc"
    rows.sort(key=lambda r: r[key], reverse=reverse)
    return {
        "rows": rows,
        "total": len(rows),
        "runtime_provider": query_result.snapshot.__dict__,
    }


@router.get("/history")
def get_history(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    dimension: str = Query("hour"),
    db: Session = Depends(get_db),
):
    """Return persisted historical KPI aggregates with trust metadata."""
    if dimension not in _HISTORY_DIMENSIONS:
        dimension = "hour"

    loop_filter = _build_loop_filter(plant_id, device_id, loop_group_id, db)
    scope_type, scope_ref = _resolve_history_scope(plant_id, device_id, loop_group_id)

    rows = (
        db.query(MonitoringAggregateSnapshot)
        .filter(
            MonitoringAggregateSnapshot.dimension == dimension,
            MonitoringAggregateSnapshot.scope_type == scope_type,
            MonitoringAggregateSnapshot.scope_ref == scope_ref,
        )
        .order_by(MonitoringAggregateSnapshot.bucket_start.asc())
        .all()
    )

    if not rows and loop_filter is not None:
        rows = (
            db.query(MonitoringAggregateSnapshot)
            .filter(
                MonitoringAggregateSnapshot.dimension == dimension,
                MonitoringAggregateSnapshot.scope_type == "loop",
                MonitoringAggregateSnapshot.scope_ref.in_(sorted(loop_filter)),
            )
            .order_by(MonitoringAggregateSnapshot.bucket_start.asc())
            .all()
        )

    points = [
        {
            "label": row.bucket_label,
            "avg_performance_score": round(row.avg_performance_score, 1),
            "avg_auto_control_rate": round(row.avg_auto_control_rate, 1),
            "avg_stability_rate": round(row.avg_stability_rate, 1),
            "trust": {
                "trusted": row.trusted,
                "confidence": round(row.confidence, 3),
                "data_completeness": round(row.data_completeness, 3),
                "reason": row.trust_reason,
            },
        }
        for row in rows[-_HISTORY_DIMENSIONS[dimension]:]
    ]

    return {
        "points": points,
        "dimension": dimension,
        "trust": {
            "source": "postgresql.monitoring_aggregate_snapshots",
            "scope_type": scope_type,
            "scope_ref": scope_ref,
            "point_count": len(points),
            "persisted": True,
        },
    }
