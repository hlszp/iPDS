"""Assessment API — fault diagnosis indicator list and radar chart data."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.loop_cache import get_all_loop_data, get_loop_data
from ..models.loop import LoopGroup, LoopTag
from ..models.plant import Device, Plant
from ..services.assessment.engine import assess_full
from ..services.diagnosis.engine import diagnose_loop
from ..services.diagnosis.suggestions import get_suggestions

router = APIRouter(prefix="/api/assessment", tags=["assessment"])


def _build_loop_filter(plant_id, device_id, loop_group_id, db):
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


@router.get("/realtime")
def get_realtime(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    min_oscillation_rate: Optional[float] = Query(None),
    min_stiction: Optional[float] = Query(None),
    grade: Optional[str] = Query(None),
    sort_by: str = Query("performance_score"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    """Return latest assessment indicators for all loops with filtering."""
    all_data = get_all_loop_data(hours=24, seed=42)
    loop_filter = _build_loop_filter(plant_id, device_id, loop_group_id, db)

    rows = []
    for ld in all_data:
        if loop_filter is not None and ld.config.tag_name not in loop_filter:
            continue
        a = assess_full(
            pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
            tag_name=ld.config.tag_name, unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
        )
        if min_oscillation_rate is not None and a.oscillation_rate < min_oscillation_rate:
            continue
        if min_stiction is not None and a.stiction_coefficient < min_stiction:
            continue
        if grade and a.grade != grade:
            continue
        rows.append({
            "tag_name": a.tag_name,
            "unit": a.unit,
            "oscillation_rate": a.oscillation_rate,
            "stiction_coefficient": a.stiction_coefficient,
            "saturation_rate": a.saturation_rate,
            "settling_time": a.settling_time,
            "op_travel_index": a.op_travel_index,
            "good_value_rate": a.good_value_rate,
            "commissioning_rate": a.commissioning_rate,
            "performance_score": a.performance_score,
            "grade": a.grade,
            "primary_fault": "",  # filled below if needed
        })

    valid_sort = {"performance_score", "oscillation_rate", "stiction_coefficient",
                  "saturation_rate", "good_value_rate", "commissioning_rate", "tag_name"}
    key = sort_by if sort_by in valid_sort else "performance_score"
    reverse = sort_dir == "desc"
    rows.sort(key=lambda r: r.get(key) or 0, reverse=reverse)

    return {"rows": rows, "total": len(rows)}


@router.get("/{tag_name}/radar")
def get_radar(tag_name: str):
    """Return radar chart data for a single loop (8 dimensions)."""
    ld = get_loop_data(tag_name, hours=24, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

    a = assess_full(
        pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
        tag_name=tag_name, unit=ld.config.unit,
        sample_interval=float(ld.config.sample_interval),
    )

    return {
        "tag_name": tag_name,
        "dimensions": [
            {"name": "自控率", "value": round(a.self_control_rate, 1), "max": 100},
            {"name": "平稳率", "value": round(a.stability_rate, 1), "max": 100},
            {"name": "优良值率", "value": round(a.good_value_rate, 1), "max": 100},
            {"name": "性能评分", "value": round(a.performance_score, 1), "max": 100},
            {"name": "振荡率", "value": round(a.oscillation_rate, 1), "max": 100},
            {"name": "粘滞系数", "value": round(a.stiction_coefficient * 100, 1), "max": 100},
            {"name": "饱和率", "value": round(a.saturation_rate, 1), "max": 100},
            {"name": "投运率", "value": round(a.commissioning_rate, 1), "max": 100},
        ],
    }


@router.get("/{tag_name}/suggestions")
def get_loop_suggestions(tag_name: str):
    """Return intelligent diagnosis and optimization suggestions for a loop."""
    ld = get_loop_data(tag_name, hours=24, seed=42)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

    diag = diagnose_loop(tag_name, ld.pv, ld.sp, ld.op,
                         sample_interval=float(ld.config.sample_interval))

    return {
        "tag_name": tag_name,
        "primary_fault": diag.primary_fault,
        "fault_confidence": round(max(
            diag.stiction_confidence if diag.stiction_detected else 0,
            diag.oscillation_confidence if diag.oscillation_detected else 0,
            diag.nonlinearity_degree if diag.nonlinearity_detected else 0,
            diag.coupling_strength if diag.coupling_candidates else 0,
        ), 3),
        "suggestion": get_suggestions(diag.primary_fault, diag.stiction_confidence),
        "details": {
            "stiction_detected": diag.stiction_detected,
            "stiction_confidence": diag.stiction_confidence,
            "oscillation_detected": diag.oscillation_detected,
            "oscillation_confidence": diag.oscillation_confidence,
            "oscillation_period": diag.oscillation_period,
            "nonlinearity_detected": diag.nonlinearity_detected,
            "nonlinearity_degree": diag.nonlinearity_degree,
            "coupling_candidates": diag.coupling_candidates,
            "coupling_strength": diag.coupling_strength,
        },
    }
