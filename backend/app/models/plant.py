"""Plant and Device — organizational hierarchy models.

Plant → Device → LoopGroup → LoopTag four-level hierarchy.
A Plant represents a factory/production site.
A Device represents a process unit/area within a plant.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from .loop import Base


class Plant(Base):
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=False, index=True)
    description = Column(String(256), nullable=True)
    monitoring_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
