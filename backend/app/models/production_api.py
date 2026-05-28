"""Production read/write schemas."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class DataSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_type: str
    host: Optional[str]
    port: Optional[int]
    database_name: Optional[str]
    username: Optional[str]
    enabled: bool
    created_at: datetime
    updated_at: datetime


class LoopSignalBindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loop_tag_id: int
    signal_type: str
    tag_code: str
    quality_rule: Optional[str]
    enabled: bool
    created_at: datetime
    updated_at: datetime


class IngestWatermarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loop_tag_id: int
    data_source_id: int
    last_timestamp: Optional[datetime]
    last_status: str
    detail: Optional[str]
    updated_at: datetime


class SnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    snapshot_id: str
    loop_tag_id: int
    created_at: datetime
    payload: dict[str, Any]


class RecommendationSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommendation_id: str
    loop_tag_id: int
    risk_level: str
    status: str
    summary_json: dict[str, Any]
    created_at: datetime


class RecommendationActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommendation_snapshot_id: int
    action_type: str
    actor: str
    comment: Optional[str]
    created_at: datetime


class OutcomeSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommendation_snapshot_id: int
    before_snapshot_id: int
    after_snapshot_id: int
    delta_json: dict[str, Any]
    created_at: datetime


class RuntimeSourceStatusResponse(BaseModel):
    configured_source: str
    effective_source: str
    healthy: bool
    degraded: bool
    fallback_reason: Optional[str]
    expected_loop_count: int
    served_loop_count: int
    missing_tags: list[str]
    detail: str
    checked_at: datetime


class RuntimeSourceUpdateRequest(BaseModel):
    source: str
