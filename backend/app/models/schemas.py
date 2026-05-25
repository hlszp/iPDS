"""PDS loop tag Pydantic schemas for API validation."""

import json
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoopTagCreate(BaseModel):
    tag_name: str = Field(..., max_length=64)
    unit: str = Field(..., max_length=32)
    sub_unit: Optional[str] = Field(None, max_length=32)
    loop_type: str = Field(..., max_length=16)
    loop_category: Optional[str] = Field(None, max_length=8)
    loop_weight: int = 1
    loop_group_id: Optional[int] = None
    device_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=256)
    pv_tag: str = Field(..., max_length=64)
    sp_tag: str = Field(..., max_length=64)
    op_tag: str = Field(..., max_length=64)
    mode_tag: Optional[str] = Field(None, max_length=64)
    eng_unit: Optional[str] = Field(None, max_length=16)
    pv_lo: Optional[float] = None
    pv_hi: Optional[float] = None
    op_lo: float = 0.0
    op_hi: float = 100.0
    sample_interval: int = 1
    dead_time_typical: Optional[float] = None
    cascade_parent: Optional[str] = Field(None, max_length=64)
    feedforward_tags: List[str] = []
    stability_threshold: float = 2.0


class LoopTagUpdate(BaseModel):
    tag_name: Optional[str] = Field(None, max_length=64)
    unit: Optional[str] = Field(None, max_length=32)
    sub_unit: Optional[str] = Field(None, max_length=32)
    loop_type: Optional[str] = Field(None, max_length=16)
    loop_category: Optional[str] = Field(None, max_length=8)
    loop_weight: Optional[int] = None
    loop_group_id: Optional[int] = None
    device_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=256)
    pv_tag: Optional[str] = Field(None, max_length=64)
    sp_tag: Optional[str] = Field(None, max_length=64)
    op_tag: Optional[str] = Field(None, max_length=64)
    mode_tag: Optional[str] = Field(None, max_length=64)
    eng_unit: Optional[str] = Field(None, max_length=16)
    pv_lo: Optional[float] = None
    pv_hi: Optional[float] = None
    op_lo: Optional[float] = None
    op_hi: Optional[float] = None
    sample_interval: Optional[int] = None
    dead_time_typical: Optional[float] = None
    cascade_parent: Optional[str] = Field(None, max_length=64)
    feedforward_tags: Optional[List[str]] = None
    stability_threshold: Optional[float] = None


class LoopTagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tag_name: str
    unit: str
    sub_unit: Optional[str]
    loop_type: str
    loop_category: Optional[str]
    loop_weight: int
    loop_group_id: Optional[int]
    device_id: Optional[int]
    description: Optional[str]
    pv_tag: str
    sp_tag: str
    op_tag: str
    mode_tag: Optional[str]
    eng_unit: Optional[str]
    pv_lo: Optional[float]
    pv_hi: Optional[float]
    op_lo: float
    op_hi: float
    sample_interval: int
    dead_time_typical: Optional[float]
    cascade_parent: Optional[str]
    feedforward_tags: List[str]
    stability_threshold: float
    created_at: datetime
    updated_at: datetime

    @field_validator("feedforward_tags", mode="before")
    @classmethod
    def parse_feedforward(cls, v):
        if isinstance(v, str):
            return json.loads(v) if v else []
        return v or []
