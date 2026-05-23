"""LoopTag — PID control loop metadata model.

Each loop tag maps DCS point names to PDS internal identifiers
and carries the engineering metadata needed for assessment.
See PLAN.md §Data Model for the design rationale.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class LoopTag(Base):
    __tablename__ = "loop_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tag_name = Column(String(64), unique=True, nullable=False, index=True)
    unit = Column(String(32), nullable=False, index=True)
    sub_unit = Column(String(32), nullable=True)
    loop_type = Column(String(16), nullable=False)  # FLOW/LEVEL/TEMP/PRESSURE/OTHER
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
