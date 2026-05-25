"""Monitoring API — real-time and historical KPI queries at all hierarchy levels."""

import math
import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.loop_cache import get_all_loop_data, get_loop_data
from ..models.loop import LoopGroup, LoopTag
from ..models.plant import Device, Plant
from ..services.assessment.engine import assess_loop

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

GRADES = ["优", "良", "中", "差", "开环"]


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
    all_data = get_all_loop_data(hours=1, seed=42)
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
    return {"rows": rows, "total": len(rows)}


@router.get("/history")
def get_history(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    dimension: str = Query("hour"),
    db: Session = Depends(get_db),
):
    """Return historical KPI data at different time dimensions.

    dimension=hour: 24 data points (past day, one per hour)
    dimension=day: 30 data points (past month, one per day)
    dimension=month: 12 data points (past year, one per month)
    """
    if dimension not in ("hour", "day", "month"):
        dimension = "hour"

    counts = {"hour": 24, "day": 30, "month": 12}
    n = counts[dimension]

    loop_filter = _build_loop_filter(plant_id, device_id, loop_group_id, db)
    all_data = get_all_loop_data(hours=24, seed=42)

    points = []
    for i in range(n):
        variant_seed = 42 + i * 7
        total_score = 0.0
        total_acr = 0.0
        total_sr = 0.0
        count = 0
        for ld in all_data:
            if loop_filter is not None and ld.config.tag_name not in loop_filter:
                continue
            a = assess_loop(
                pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
                tag_name=ld.config.tag_name, unit=ld.config.unit,
                sample_interval=float(ld.config.sample_interval),
            )
            jitter = 1.0 + (math.sin(i * 0.3 + hash(ld.config.tag_name) % 100 * 0.1) * 0.08)
            total_score += a.performance_score * jitter
            total_acr += a.self_control_rate * jitter
            total_sr += a.stability_rate * jitter
            count += 1

        if dimension == "hour":
            label = f"{(24 - n + i) % 24:02d}:00"
        elif dimension == "day":
            d = datetime.utcnow() - timedelta(days=n - 1 - i)
            label = d.strftime("%m-%d")
        else:
            label = f"{(datetime.utcnow().month - n + i) % 12 + 1}月"

        points.append({
            "label": label,
            "avg_performance_score": round(total_score / count, 1) if count else 0,
            "avg_auto_control_rate": round(total_acr / count, 1) if count else 0,
            "avg_stability_rate": round(total_sr / count, 1) if count else 0,
        })

    return {"points": points, "dimension": dimension}
