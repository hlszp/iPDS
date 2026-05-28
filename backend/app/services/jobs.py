"""Report and scheduler persistence helpers."""

import hashlib
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.production import MonitoringAggregateSnapshot, ReportArtifact, ReportJob, SchedulerJob, SchedulerRun


REPORT_FAILURES = {
    "loop_not_found": {"status_code": 404, "detail": "Loop not found"},
    "unit_not_found": {"status_code": 404, "detail": "No loops found for requested unit"},
    "runtime_query_failed": {"status_code": 503, "detail": "Runtime data query failed"},
    "assessment_failed": {"status_code": 422, "detail": "Assessment engine failed"},
    "diagnosis_failed": {"status_code": 422, "detail": "Diagnosis engine failed"},
    "report_render_failed": {"status_code": 500, "detail": "Report rendering failed"},
}


def create_report_job(
    db: Session,
    scope_type: str,
    scope_ref: str,
    period: str,
    requested_by: Optional[str],
) -> ReportJob:
    row = ReportJob(
        job_id=_job_id("report"),
        scope_type=scope_type,
        scope_ref=scope_ref,
        period=period,
        status="running",
        requested_by=requested_by,
    )
    db.add(row)
    db.flush()
    return row


def create_report_artifact(
    db: Session,
    report_job_id: int,
    format_name: str,
    filename: str,
    payload: bytes,
) -> ReportArtifact:
    row = ReportArtifact(
        artifact_id=_job_id("artifact"),
        report_job_id=report_job_id,
        format=format_name,
        storage_uri=f"memory://reports/{filename}",
        checksum=hashlib.sha256(payload).hexdigest(),
    )
    db.add(row)
    db.flush()
    return row


def finalize_report_job(
    db: Session,
    report_job: ReportJob,
    status: str,
    failure_code: Optional[str] = None,
    failure_detail: Optional[str] = None,
) -> ReportJob:
    report_job.status = status
    report_job.failure_code = failure_code
    report_job.failure_detail = failure_detail
    report_job.updated_at = datetime.utcnow()
    db.add(report_job)
    db.flush()
    return report_job


def create_monitoring_aggregate_snapshot(
    db: Session,
    *,
    scope_type: str,
    scope_ref: str,
    dimension: str,
    bucket_label: str,
    bucket_start: datetime,
    bucket_end: datetime,
    avg_performance_score: float,
    avg_auto_control_rate: float,
    avg_stability_rate: float,
    data_completeness: float,
    confidence: float,
    trusted: bool,
    trust_reason: Optional[str],
    metrics_json: Optional[dict] = None,
) -> MonitoringAggregateSnapshot:
    row = MonitoringAggregateSnapshot(
        snapshot_id=_job_id("monitoring"),
        scope_type=scope_type,
        scope_ref=scope_ref,
        dimension=dimension,
        bucket_label=bucket_label,
        bucket_start=bucket_start,
        bucket_end=bucket_end,
        avg_performance_score=avg_performance_score,
        avg_auto_control_rate=avg_auto_control_rate,
        avg_stability_rate=avg_stability_rate,
        data_completeness=data_completeness,
        confidence=confidence,
        trusted=trusted,
        trust_reason=trust_reason,
        metrics_json=metrics_json or {},
    )
    db.add(row)
    db.flush()
    return row


def create_scheduler_job(
    db: Session,
    job_key: str,
    job_type: str,
    cron_expr: str,
    config_json: dict,
    enabled: bool = True,
) -> SchedulerJob:
    row = SchedulerJob(
        job_key=job_key,
        job_type=job_type,
        cron_expr=cron_expr,
        enabled=enabled,
        config_json=config_json,
    )
    db.add(row)
    db.flush()
    return row


def create_scheduler_run(db: Session, scheduler_job_id: int) -> SchedulerRun:
    row = SchedulerRun(
        run_id=_job_id("run"),
        scheduler_job_id=scheduler_job_id,
        started_at=datetime.utcnow(),
        status="running",
    )
    db.add(row)
    db.flush()
    return row


def finalize_scheduler_run(db: Session, scheduler_run: SchedulerRun, status: str, message: Optional[str] = None) -> SchedulerRun:
    scheduler_run.status = status
    scheduler_run.message = message
    scheduler_run.finished_at = datetime.utcnow()
    db.add(scheduler_run)
    db.flush()
    return scheduler_run


def _job_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"
