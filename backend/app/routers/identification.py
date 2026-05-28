"""Standalone identification API — process model estimation from runtime data."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..models.loop import LoopTag
from ..services.identification.engine import check_excitation, identify_arx, identify_best, identify_subspace, ProcessModel
from ..services.snapshots import persist_identification_snapshot
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/identification", tags=["identification"])


@router.get("/{tag_name}")
def get_identification(tag_name: str, db: Session = Depends(get_db)):
    """Run system identification on a single loop and return the best process model."""
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

    query_result = get_runtime_source_manager().resolve_loop_data(hours=24, seed=42)
    ld = next((item for item in query_result.loops if item.config.tag_name == tag_name), None)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"No runtime data for '{tag_name}'")

    config = ld.config
    sample_interval = float(config.sample_interval)

    ei = check_excitation(ld.op, ld.sp)
    arx_model = identify_arx(ld.pv, ld.op, sample_interval=sample_interval)
    subspace_model = identify_subspace(ld.pv, ld.op, sample_interval=sample_interval)
    best = identify_best(ld.pv, ld.op, ld.sp, sample_interval=sample_interval)

    candidates = []
    for m in [arx_model, subspace_model]:
        candidates.append({
            "method": m.method,
            "gain": m.gain,
            "tau": m.tau,
            "dead_time": m.dead_time,
            "r_squared": m.r_squared,
            "excitation_index": m.excitation_index,
        })

    now = datetime.utcnow()
    window_start = now - timedelta(hours=24)
    persist_identification_snapshot(db, loop.id, best, window_start, now)
    db.commit()

    return {
        "tag_name": tag_name,
        "excitation_index": ei,
        "excitation_sufficient": ei >= 0.5,
        "best_model": {
            "method": best.best_model.method if best.best_model else "unavailable",
            "gain": best.best_model.gain if best.best_model else 0,
            "tau": best.best_model.tau if best.best_model else 0,
            "dead_time": best.best_model.dead_time if best.best_model else 0,
            "r_squared": best.best_model.r_squared if best.best_model else 0,
            "excitation_index": best.best_model.excitation_index if best.best_model else 0,
        },
        "fallback_reason": best.fallback_reason,
        "candidates": candidates,
    }


@router.get("/{tag_name}/excitation")
def get_excitation_check(tag_name: str):
    """Return only the excitation index check for a loop, without running full identification."""
    query_result = get_runtime_source_manager().resolve_loop_data(hours=24, seed=42)
    ld = next((item for item in query_result.loops if item.config.tag_name == tag_name), None)
    if ld is None:
        raise HTTPException(status_code=404, detail=f"No runtime data for '{tag_name}'")

    ei = check_excitation(ld.op, ld.sp)
    return {
        "tag_name": tag_name,
        "excitation_index": ei,
        "excitation_sufficient": ei >= 0.5,
        "recommendation": "数据激励充足，可以进行系统辨识" if ei >= 0.5 else "数据激励不足，辨识结果可能不可靠。建议在回路中加入小幅设定值阶跃后再试。",
    }
