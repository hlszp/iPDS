"""Pydantic schemas for Plant and Device CRUD."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PlantCreate(BaseModel):
    name: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class PlantUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)


class PlantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str]
    created_at: datetime


class DeviceCreate(BaseModel):
    name: str = Field(..., max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    monitoring_enabled: bool = True


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    monitoring_enabled: Optional[bool] = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    plant_id: int
    description: Optional[str]
    monitoring_enabled: bool
    created_at: datetime


# ── Tree response (full hierarchy) ──────────────────────────────────────────

class TreeNodeLoop(BaseModel):
    tag_name: str
    loop_type: str
    loop_category: Optional[str]
    grade: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TreeNodeLoopGroup(BaseModel):
    id: int
    name: str
    weight: int
    loops: list[TreeNodeLoop] = []

    model_config = ConfigDict(from_attributes=True)


class TreeNodeDevice(BaseModel):
    id: int
    name: str
    monitoring_enabled: bool
    loop_groups: list[TreeNodeLoopGroup] = []

    model_config = ConfigDict(from_attributes=True)


class TreeNodePlant(BaseModel):
    id: int
    name: str
    devices: list[TreeNodeDevice] = []

    model_config = ConfigDict(from_attributes=True)


class PlantTreeResponse(BaseModel):
    plants: list[TreeNodePlant]
