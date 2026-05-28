"""Configuration audit helpers."""

import uuid
from typing import Optional

from sqlalchemy.orm import Session

from ..models.production import AuditEvent


def record_audit_event(
    db: Session,
    event_type: str,
    actor: str,
    target_type: str,
    target_id: str,
    payload_json: dict,
) -> AuditEvent:
    row = AuditEvent(
        event_id=f"audit_{uuid.uuid4().hex[:12]}",
        event_type=event_type,
        actor=actor,
        target_type=target_type,
        target_id=target_id,
        payload_json=payload_json,
    )
    db.add(row)
    db.flush()
    return row
