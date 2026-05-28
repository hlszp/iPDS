"""Bootstrap helpers for schema compatibility and dev seeding."""

import json

from sqlalchemy import inspect, text

from .data.database import SessionLocal, engine
from .data.mock import PRESET_LOOPS
from .models.loop import LoopGroup, LoopTag
from .models.plant import Device, Plant

ENG_UNIT_MAP = {"FLOW": "t/h", "LEVEL": "%", "TEMP": "°C", "PRESSURE": "MPa"}


def ensure_loop_schema() -> None:
    inspector = inspect(engine)
    loop_tag_columns = {column["name"] for column in inspector.get_columns("loop_tags")} if inspector.has_table("loop_tags") else set()
    loop_group_columns = {column["name"] for column in inspector.get_columns("loop_groups")} if inspector.has_table("loop_groups") else set()
    if "loop_category" not in loop_tag_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE loop_tags ADD COLUMN loop_category VARCHAR(8)"))
    if "loop_weight" not in loop_tag_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE loop_tags ADD COLUMN loop_weight INTEGER DEFAULT 1"))
    if "loop_group_id" not in loop_tag_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE loop_tags ADD COLUMN loop_group_id INTEGER"))
    if "device_id" not in loop_tag_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE loop_tags ADD COLUMN device_id INTEGER"))
    if "device_id" not in loop_group_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE loop_groups ADD COLUMN device_id INTEGER"))


def migrate_plant_device() -> None:
    db = SessionLocal()
    try:
        distinct_units = {r[0] for r in db.query(LoopTag.unit).distinct() if r[0]}
        for unit_name in distinct_units:
            plant = db.query(Plant).filter(Plant.name == unit_name).first()
            if not plant:
                plant = Plant(name=unit_name, description=f"{unit_name} 工厂")
                db.add(plant)
                db.flush()
            device = db.query(Device).filter(Device.plant_id == plant.id, Device.name == "主装置").first()
            if not device:
                device = Device(plant_id=plant.id, name="主装置", description=f"{unit_name} 主装置")
                db.add(device)
                db.flush()
            db.query(LoopTag).filter(LoopTag.unit == unit_name, LoopTag.device_id.is_(None)).update(
                {LoopTag.device_id: device.id}, synchronize_session=False
            )
            db.query(LoopGroup).filter(LoopGroup.unit == unit_name, LoopGroup.device_id.is_(None)).update(
                {LoopGroup.device_id: device.id}, synchronize_session=False
            )
        db.commit()
    finally:
        db.close()


def seed_loop_groups() -> None:
    db = SessionLocal()
    try:
        defaults = [
            ("甲醇装置", "反应与分离", 3),
            ("PSA 制氢", "吸附与稳压", 2),
            ("气化", "原料与气化炉", 3),
            ("氨合成", "反应与循环", 3),
            ("低温甲醇洗", "洗涤与循环", 2),
        ]
        for unit_name, name, weight in defaults:
            if not db.query(LoopGroup).filter(LoopGroup.unit == unit_name, LoopGroup.name == name).first():
                device = db.query(Device).join(Plant).filter(Plant.name == unit_name, Device.name == "主装置").first()
                db.add(LoopGroup(
                    unit=unit_name, name=name, weight=weight,
                    description=f"{unit_name} {name}",
                    device_id=device.id if device else None,
                ))
        db.commit()
    finally:
        db.close()


def seed_loops() -> None:
    db = SessionLocal()
    try:
        group_map = {(g.unit, g.name): g.id for g in db.query(LoopGroup).all()}
        default_group_name = {
            "甲醇装置": "反应与分离",
            "PSA 制氢": "吸附与稳压",
            "气化": "原料与气化炉",
            "氨合成": "反应与循环",
            "低温甲醇洗": "洗涤与循环",
        }
        category_map = {
            "FLOW": "快速型",
            "LEVEL": "慢速型",
            "TEMP": "稳定型",
            "PRESSURE": "稳定型",
        }
        weight_map = {
            "FLOW": 2,
            "LEVEL": 1,
            "TEMP": 3,
            "PRESSURE": 3,
        }
        for c in PRESET_LOOPS:
            group_name = default_group_name.get(c.unit)
            group_id = group_map.get((c.unit, group_name)) if group_name else None
            loop_type = c.loop_type if c.loop_type in ENG_UNIT_MAP else "OTHER"
            loop = db.query(LoopTag).filter(LoopTag.tag_name == c.tag_name).first()
            if not loop:
                db.add(LoopTag(
                    tag_name=c.tag_name,
                    unit=c.unit,
                    loop_group_id=group_id,
                    loop_type=loop_type,
                    loop_category=category_map.get(loop_type, "稳定型"),
                    loop_weight=weight_map.get(loop_type, 1),
                    description=c.description or f"{c.tag_name} 控制回路",
                    pv_tag=f"{c.tag_name}.PV",
                    sp_tag=f"{c.tag_name}.SP",
                    op_tag=f"{c.tag_name}.OP",
                    mode_tag=f"{c.tag_name}.MODE",
                    eng_unit=ENG_UNIT_MAP.get(loop_type, "EU"),
                    sample_interval=c.sample_interval,
                    dead_time_typical=c.dead_time,
                ))
                continue
            if loop.loop_group_id is None:
                loop.loop_group_id = group_id
            if not loop.loop_category:
                loop.loop_category = category_map.get(loop_type, "稳定型")
            if not loop.loop_weight:
                loop.loop_weight = weight_map.get(loop_type, 1)
        db.commit()
    finally:
        db.close()
