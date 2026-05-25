"""Configuration CRUD API — loop tag and loop group management."""

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..models.loop import LoopGroup, LoopTag
from ..models.schemas import LoopTagCreate, LoopTagResponse, LoopTagUpdate

router = APIRouter(prefix="/api/config/loops", tags=["config"])

groups_router = APIRouter(prefix="/api/config/groups", tags=["config"])


@router.get("", response_model=list[LoopTagResponse])
def list_loops(
    unit: Optional[str] = Query(None),
    loop_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(LoopTag)
    if unit:
        q = q.filter(LoopTag.unit == unit)
    if loop_type:
        q = q.filter(LoopTag.loop_type == loop_type)
    return q.offset(skip).limit(limit).all()


@router.get("/{tag_name}", response_model=LoopTagResponse)
def get_loop(tag_name: str, db: Session = Depends(get_db)):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")
    return loop


@router.post("", response_model=LoopTagResponse, status_code=201)
def create_loop(payload: LoopTagCreate, db: Session = Depends(get_db)):
    existing = db.query(LoopTag).filter(LoopTag.tag_name == payload.tag_name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Loop '{payload.tag_name}' already exists")
    loop = LoopTag(
        **payload.model_dump(exclude={"feedforward_tags"}),
        feedforward_tags=json.dumps(payload.feedforward_tags),
    )
    db.add(loop)
    db.commit()
    db.refresh(loop)
    return _to_response(loop)


@router.put("/{tag_name}", response_model=LoopTagResponse)
def update_loop(tag_name: str, payload: LoopTagUpdate, db: Session = Depends(get_db)):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")
    updates = payload.model_dump(exclude_unset=True)
    if "feedforward_tags" in updates:
        updates["feedforward_tags"] = json.dumps(updates["feedforward_tags"])
    for key, val in updates.items():
        setattr(loop, key, val)
    db.commit()
    db.refresh(loop)
    return _to_response(loop)


@router.delete("/{tag_name}", status_code=204)
def delete_loop(tag_name: str, db: Session = Depends(get_db)):
    loop = db.query(LoopTag).filter(LoopTag.tag_name == tag_name).first()
    if not loop:
        raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")
    db.delete(loop)
    db.commit()


@groups_router.get("")
def list_groups(unit: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(LoopGroup)
    if unit:
        q = q.filter(LoopGroup.unit == unit)
    groups = q.order_by(LoopGroup.unit.asc(), LoopGroup.name.asc()).all()
    return [
        {
            "id": g.id,
            "name": g.name,
            "unit": g.unit,
            "description": g.description,
            "weight": g.weight,
            "created_at": g.created_at,
        }
        for g in groups
    ]


@groups_router.post("")
def create_group(payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    unit = (payload.get("unit") or "").strip()
    if not name or not unit:
        raise HTTPException(status_code=400, detail="name and unit are required")
    group = LoopGroup(
        name=name,
        unit=unit,
        description=(payload.get("description") or "").strip() or None,
        weight=int(payload.get("weight") or 1),
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return {
        "id": group.id,
        "name": group.name,
        "unit": group.unit,
        "description": group.description,
        "weight": group.weight,
        "created_at": group.created_at,
    }


@groups_router.delete("/{group_id}", status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(LoopGroup).filter(LoopGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group not found")
    attached = db.query(LoopTag).filter(LoopTag.loop_group_id == group_id).first()
    if attached:
        raise HTTPException(status_code=409, detail="group still has loops attached")
    db.delete(group)
    db.commit()


def _to_response(loop: LoopTag) -> LoopTagResponse:
    ff = json.loads(loop.feedforward_tags) if loop.feedforward_tags else []
    return LoopTagResponse(
        id=loop.id,
        tag_name=loop.tag_name,
        unit=loop.unit,
        sub_unit=loop.sub_unit,
        loop_type=loop.loop_type,
        loop_category=loop.loop_category,
        loop_weight=loop.loop_weight,
        loop_group_id=loop.loop_group_id,
        description=loop.description,
        pv_tag=loop.pv_tag,
        sp_tag=loop.sp_tag,
        op_tag=loop.op_tag,
        mode_tag=loop.mode_tag,
        eng_unit=loop.eng_unit,
        pv_lo=loop.pv_lo,
        pv_hi=loop.pv_hi,
        op_lo=loop.op_lo,
        op_hi=loop.op_hi,
        sample_interval=loop.sample_interval,
        dead_time_typical=loop.dead_time_typical,
        cascade_parent=loop.cascade_parent,
        feedforward_tags=ff,
        stability_threshold=loop.stability_threshold,
        created_at=loop.created_at,
        updated_at=loop.updated_at,
    )
