"""Plant & Device hierarchy — CRUD API and full tree endpoint."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..data.loop_cache import get_all_loop_data
from ..models.loop import LoopGroup, LoopTag
from ..models.plant import Device, Plant
from ..models.plant_schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceUpdate,
    PlantCreate,
    PlantResponse,
    PlantTreeResponse,
    PlantUpdate,
    TreeNodeDevice,
    TreeNodeLoop,
    TreeNodeLoopGroup,
    TreeNodePlant,
)
from ..services.assessment.engine import assess_loop

router = APIRouter(prefix="/api/plants", tags=["plants"])
device_router = APIRouter(prefix="/api/devices", tags=["devices"])


# ── Plants ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PlantResponse])
def list_plants(db: Session = Depends(get_db)):
    return db.query(Plant).order_by(Plant.name).all()


@router.post("", response_model=PlantResponse, status_code=201)
def create_plant(payload: PlantCreate, db: Session = Depends(get_db)):
    existing = db.query(Plant).filter(Plant.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Plant '{payload.name}' already exists")
    plant = Plant(**payload.model_dump())
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.put("/{plant_id}", response_model=PlantResponse)
def update_plant(plant_id: int, payload: PlantUpdate, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail=f"Plant {plant_id} not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, val in updates.items():
        setattr(plant, key, val)
    db.commit()
    db.refresh(plant)
    return plant


@router.delete("/{plant_id}", status_code=204)
def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail=f"Plant {plant_id} not found")
    devices = db.query(Device).filter(Device.plant_id == plant_id).all()
    for d in devices:
        device_id = d.id
        db.query(LoopTag).filter(LoopTag.device_id == device_id).update({"device_id": None})
        db.query(LoopGroup).filter(LoopGroup.device_id == device_id).update({"device_id": None})
        db.delete(d)
    db.delete(plant)
    db.commit()


# ── Devices ───────────────────────────────────────────────────────────────────

@router.get("/{plant_id}/devices", response_model=list[DeviceResponse])
def list_devices(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail=f"Plant {plant_id} not found")
    return db.query(Device).filter(Device.plant_id == plant_id).order_by(Device.name).all()


@router.post("/{plant_id}/devices", response_model=DeviceResponse, status_code=201)
def create_device(plant_id: int, payload: DeviceCreate, db: Session = Depends(get_db)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail=f"Plant {plant_id} not found")
    device = Device(plant_id=plant_id, **payload.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@device_router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, payload: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    updates = payload.model_dump(exclude_unset=True)
    for key, val in updates.items():
        setattr(device, key, val)
    db.commit()
    db.refresh(device)
    return device


@device_router.delete("/{device_id}", status_code=204)
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    db.query(LoopTag).filter(LoopTag.device_id == device_id).update({"device_id": None})
    db.query(LoopGroup).filter(LoopGroup.device_id == device_id).update({"device_id": None})
    db.delete(device)
    db.commit()


# ── Tree ──────────────────────────────────────────────────────────────────────

@router.get("/tree", response_model=PlantTreeResponse)
def get_tree(db: Session = Depends(get_db)):
    """Return full Plant → Device → LoopGroup → Loop hierarchy with grades."""
    plants = db.query(Plant).order_by(Plant.name).all()
    all_groups = db.query(LoopGroup).order_by(LoopGroup.name).all()
    all_loops = db.query(LoopTag).order_by(LoopTag.tag_name).all()

    # Build lookup maps
    group_map = {}
    for g in all_groups:
        group_map.setdefault(g.device_id, []).append(g)

    loop_map = {}
    for l in all_loops:
        loop_map.setdefault(l.loop_group_id, []).append(l)

    # Get assessment grades from cached loop data
    grade_map = {}
    try:
        all_data = get_all_loop_data(hours=1, seed=42)
        for ld in all_data:
            a = assess_loop(
                pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
                tag_name=ld.config.tag_name, unit=ld.config.unit,
                sample_interval=float(ld.config.sample_interval),
            )
            grade_map[ld.config.tag_name] = a.grade
    except Exception:
        pass

    tree_plants = []
    for plant in plants:
        devices = db.query(Device).filter(Device.plant_id == plant.id).order_by(Device.name).all()
        tree_devices = []
        for device in devices:
            groups = group_map.get(device.id, [])
            tree_groups = []
            for grp in groups:
                loops = loop_map.get(grp.id, [])
                tree_loops = [
                    TreeNodeLoop(
                        tag_name=l.tag_name,
                        loop_type=l.loop_type or "",
                        loop_category=l.loop_category,
                        grade=grade_map.get(l.tag_name),
                    )
                    for l in loops
                ]
                tree_groups.append(TreeNodeLoopGroup(
                    id=grp.id,
                    name=grp.name,
                    weight=grp.weight or 1,
                    loops=tree_loops,
                ))
            tree_devices.append(TreeNodeDevice(
                id=device.id,
                name=device.name,
                monitoring_enabled=device.monitoring_enabled,
                loop_groups=tree_groups,
            ))
        tree_plants.append(TreeNodePlant(id=plant.id, name=plant.name, devices=tree_devices))

    return PlantTreeResponse(plants=tree_plants)
