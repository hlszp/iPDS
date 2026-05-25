"""Overview API — plant-level KPI summary and auto-control rate dashboard."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.loop_cache import get_all_loop_data
from ..models.loop import LoopGroup, LoopTag
from ..models.plant import Device, Plant
from ..services.assessment.engine import LoopAssessment, assess_loop

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("/summary")
def get_summary(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Return Overview page data: auto-control rate gauge, KPI, detail table."""
    all_data = get_all_loop_data(hours=24, seed=42)

    # Filter by hierarchy
    loop_filter = set()
    if plant_id or device_id or loop_group_id:
        q = db.query(LoopTag)
        if loop_group_id:
            q = q.filter(LoopTag.loop_group_id == loop_group_id)
        elif device_id:
            q = q.filter(LoopTag.device_id == device_id)
        elif plant_id:
            device_ids = [d.id for d in db.query(Device).filter(Device.plant_id == plant_id).all()]
            q = q.filter(LoopTag.device_id.in_(device_ids) if device_ids else LoopTag.id.is_(None))
        loop_filter = {lt.tag_name for lt in q.all()}

    # Run assessment on all loops
    assessments = []
    auto_count = 0
    manual_count = 0
    for ld in all_data:
        if loop_filter and ld.config.tag_name not in loop_filter:
            continue
        a = assess_loop(
            pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
            tag_name=ld.config.tag_name, unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
        )
        assessments.append(a)
        auto_modes = sum(1 for m in ld.mode if m in ("AUTO", "CASCADE"))
        if auto_modes > len(ld.mode) / 2:
            auto_count += 1
        else:
            manual_count += 1

    total = auto_count + manual_count
    auto_control_rate = round(auto_count / total * 100, 1) if total else 0

    # Build detail rows grouped by plant→device→loop_group
    db_loops = {lt.tag_name: lt for lt in db.query(LoopTag).all()}
    db_groups = {g.id: g for g in db.query(LoopGroup).all()}
    db_devices = {d.id: d for d in db.query(Device).all()}
    db_plants = {p.id: p for p in db.query(Plant).all()}

    group_loops = {}
    for a in assessments:
        lt = db_loops.get(a.tag_name)
        if lt and lt.loop_group_id:
            group_loops.setdefault(lt.loop_group_id, []).append(a)

    detail = []
    for gid, loops in group_loops.items():
        grp = db_groups.get(gid)
        if not grp:
            continue
        dev = db_devices.get(grp.device_id) if grp.device_id else None
        plant = db_plants.get(dev.plant_id) if dev else None

        grades = {"优": 0, "良": 0, "中": 0, "差": 0, "开环": 0}
        for a in loops:
            grades[a.grade] = grades.get(a.grade, 0) + 1

        detail.append({
            "plant_name": plant.name if plant else "",
            "device_name": dev.name if dev else "",
            "loop_group_name": grp.name,
            "total_loops": len(loops),
            "grade_distribution": grades,
            "avg_performance_score": round(sum(a.performance_score for a in loops) / len(loops), 1),
            "auto_control_rate": round(sum(a.self_control_rate for a in loops) / len(loops), 1),
            "stability_rate": round(sum(a.stability_rate for a in loops) / len(loops), 1),
        })

    detail.sort(key=lambda x: x["avg_performance_score"], reverse=True)

    # Prev-hour aggregate KPI
    avg_score = round(sum(a.performance_score for a in assessments) / len(assessments), 1) if assessments else 0
    avg_acr = round(sum(a.self_control_rate for a in assessments) / len(assessments), 1) if assessments else 0
    avg_sr = round(sum(a.stability_rate for a in assessments) / len(assessments), 1) if assessments else 0

    # Top/bottom N rankings
    ranked = sorted(assessments, key=lambda x: x.performance_score, reverse=True)
    top_loops = [
        {"tag_name": a.tag_name, "unit": a.unit, "grade": a.grade, "performance_score": a.performance_score}
        for a in ranked[:5]
    ]
    bottom_loops = [
        {"tag_name": a.tag_name, "unit": a.unit, "grade": a.grade, "performance_score": a.performance_score}
        for a in ranked[-5:]
    ]

    return {
        "auto_control_rate": auto_control_rate,
        "total_loops": total,
        "auto_loops": auto_count,
        "manual_loops": manual_count,
        "prev_hour_kpi": {
            "performance_score": avg_score,
            "auto_control_rate": avg_acr,
            "stability_rate": avg_sr,
        },
        "top_loops": top_loops,
        "bottom_loops": bottom_loops,
        "detail_table": detail,
        "grade_filter_options": ["优", "良", "中", "差", "开环"],
    }
