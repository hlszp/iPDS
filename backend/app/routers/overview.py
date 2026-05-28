"""Overview API — plant-level KPI summary and auto-control rate dashboard."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..models.loop import LoopGroup, LoopTag
from ..models.plant import Device, Plant
from ..services.assessment.engine import assess_loop

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("/summary")
def get_summary(
    plant_id: Optional[int] = Query(None),
    device_id: Optional[int] = Query(None),
    loop_group_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Return Overview page data: auto-control rate gauge, KPI, detail table."""
    db_loops = {lt.tag_name: lt for lt in db.query(LoopTag).all()}
    db_groups = {g.id: g for g in db.query(LoopGroup).all()}
    db_devices = {d.id: d for d in db.query(Device).all()}
    db_plants = {p.id: p for p in db.query(Plant).all()}

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

    query_result = get_runtime_source_manager().resolve_loop_data(db=db, hours=1, seed=42)
    all_data = query_result.loops

    assessments = []
    auto_count = 0
    manual_count = 0
    for ld in all_data:
        if loop_filter and ld.config.tag_name not in loop_filter:
            continue
        loop_tag = db_loops.get(ld.config.tag_name)
        if loop_tag is None:
            continue
        assessment = assess_loop(
            pv=ld.pv,
            sp=ld.sp,
            op=ld.op,
            mode=ld.mode,
            tag_name=ld.config.tag_name,
            unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
            loop_category=loop_tag.loop_category or "稳定型",
            stability_threshold=loop_tag.stability_threshold or 2.0,
        )
        assessments.append(assessment)
        auto_modes = sum(1 for mode in ld.mode if mode in ("AUTO", "CASCADE"))
        if auto_modes > len(ld.mode) / 2:
            auto_count += 1
        else:
            manual_count += 1

    total = auto_count + manual_count
    auto_control_rate = round(auto_count / total * 100, 1) if total else 0

    group_loops = {}
    for assessment in assessments:
        loop_tag = db_loops.get(assessment.tag_name)
        if loop_tag and loop_tag.loop_group_id:
            group_loops.setdefault(loop_tag.loop_group_id, []).append(assessment)

    detail_table = []
    for group_id, loops in group_loops.items():
        group = db_groups.get(group_id)
        if not group:
            continue
        device = db_devices.get(group.device_id) if group.device_id else None
        plant = db_plants.get(device.plant_id) if device else None

        grades = {"优": 0, "良": 0, "中": 0, "差": 0, "开环": 0}
        for assessment in loops:
            grades[assessment.grade] = grades.get(assessment.grade, 0) + 1

        detail_table.append(
            {
                "plant_name": plant.name if plant else "",
                "device_name": device.name if device else "",
                "loop_group_name": group.name,
                "total_loops": len(loops),
                "grade_distribution": grades,
                "avg_performance_score": round(sum(item.performance_score for item in loops) / len(loops), 1),
                "auto_control_rate": round(sum(item.self_control_rate for item in loops) / len(loops), 1),
                "stability_rate": round(sum(item.stability_rate for item in loops) / len(loops), 1),
            }
        )

    detail_table.sort(key=lambda row: row["avg_performance_score"], reverse=True)

    avg_score = round(sum(item.performance_score for item in assessments) / len(assessments), 1) if assessments else 0
    avg_auto_rate = round(sum(item.self_control_rate for item in assessments) / len(assessments), 1) if assessments else 0
    avg_stability_rate = round(sum(item.stability_rate for item in assessments) / len(assessments), 1) if assessments else 0

    ranked = sorted(assessments, key=lambda item: item.performance_score, reverse=True)
    top_loops = [
        {"tag_name": item.tag_name, "unit": item.unit, "grade": item.grade, "performance_score": item.performance_score}
        for item in ranked[:5]
    ]
    bottom_loops = [
        {"tag_name": item.tag_name, "unit": item.unit, "grade": item.grade, "performance_score": item.performance_score}
        for item in ranked[-5:]
    ]

    return {
        "auto_control_rate": auto_control_rate,
        "total_loops": total,
        "auto_loops": auto_count,
        "manual_loops": manual_count,
        "prev_hour_kpi": {
            "performance_score": avg_score,
            "auto_control_rate": avg_auto_rate,
            "stability_rate": avg_stability_rate,
        },
        "top_loops": top_loops,
        "bottom_loops": bottom_loops,
        "detail_table": detail_table,
        "grade_filter_options": ["优", "良", "中", "差", "开环"],
        "runtime_provider": query_result.snapshot.__dict__,
    }
