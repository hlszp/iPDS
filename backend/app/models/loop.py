"""LoopTag — PID control loop metadata model.

Each loop tag maps DCS point names to PDS internal identifiers
and carries the engineering metadata needed for assessment.
Supports plant → unit → loop_group → loop hierarchy.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

LOOP_TYPES = ["FLOW", "LEVEL", "TEMP", "PRESSURE", "OTHER"]
LOOP_CATEGORIES = ["稳定型", "慢速型", "快速型", "逻辑型"]

CATEGORY_WEIGHTS = {
    "稳定型": {"a": 0.2, "f": 0.3, "s": 0.5},
    "慢速型": {"a": 0.3, "f": 0.1, "s": 0.6},
    "快速型": {"a": 0.2, "f": 0.5, "s": 0.3},
    "逻辑型": {"a": 0.0, "f": 0.5, "s": 0.6},
}


class LoopGroup(Base):
    __tablename__ = "loop_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    unit = Column(String(32), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    description = Column(String(256), nullable=True)
    weight = Column(Integer, default=1)  # 1/2/3
    created_at = Column(DateTime, default=datetime.utcnow)


class LoopTag(Base):
    __tablename__ = "loop_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tag_name = Column(String(64), unique=True, nullable=False, index=True)
    unit = Column(String(32), nullable=False, index=True)
    sub_unit = Column(String(32), nullable=True)
    loop_type = Column(String(16), nullable=False)  # FLOW/LEVEL/TEMP/PRESSURE/OTHER
    loop_category = Column(String(8), nullable=True)  # 稳定型/慢速型/快速型/逻辑型
    loop_weight = Column(Integer, default=1)  # 1/2/3
    loop_group_id = Column(Integer, ForeignKey("loop_groups.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    description = Column(String(256), nullable=True)
    pv_tag = Column(String(64), nullable=False)
    sp_tag = Column(String(64), nullable=False)
    op_tag = Column(String(64), nullable=False)
    mode_tag = Column(String(64), nullable=True)
    eng_unit = Column(String(16), nullable=True)
    pv_lo = Column(Float, nullable=True)
    pv_hi = Column(Float, nullable=True)
    op_lo = Column(Float, default=0.0)
    op_hi = Column(Float, default=100.0)
    sample_interval = Column(Integer, default=1)  # seconds
    dead_time_typical = Column(Float, nullable=True)
    cascade_parent = Column(String(64), nullable=True)
    feedforward_tags = Column(Text, nullable=True)  # JSON array string
    stability_threshold = Column(Float, default=2.0)  # percent
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
