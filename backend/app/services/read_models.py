"""Snapshot-first and scheduler query helpers."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..models.production import AssessmentSnapshot, DashboardSnapshot, ReportArtifact, ReportJob, SchedulerJob, SchedulerRun


def get_latest_assessment_snapshot(db: Session, loop_tag_id: int) -> Optional[AssessmentSnapshot]:
    return db.query(AssessmentSnapshot).filter(AssessmentSnapshot.loop_tag_id == loop_tag_id).order_by(AssessmentSnapshot.created_at.desc()).first()


def list_latest_assessment_snapshots(db: Session) -> list[AssessmentSnapshot]:
    snapshot_ids = (
        db.query(AssessmentSnapshot.loop_tag_id, AssessmentSnapshot.created_at)
        .order_by(AssessmentSnapshot.loop_tag_id.asc(), AssessmentSnapshot.created_at.desc())
        .all()
    )
    latest = {}
    for row in snapshot_ids:
        latest.setdefault(row.loop_tag_id, row.created_at)
    if not latest:
        return []
    rows = []
    for loop_tag_id, created_at in latest.items():
        row = db.query(AssessmentSnapshot).filter(
            AssessmentSnapshot.loop_tag_id == loop_tag_id,
            AssessmentSnapshot.created_at == created_at,
        ).first()
        if row:
            rows.append(row)
    return rows


def create_default_scheduler_jobs(db: Session) -> None:
    defaults = [
        ("assessment-hourly", "assessment", "7 * * * *", {"window_hours": 1}),
        ("report-daily", "report", "17 6 * * *", {"scope_type": "unit", "scope_ref": "全厂", "period": "日报"}),
    ]
    for job_key, job_type, cron_expr, config_json in defaults:
        exists = db.query(SchedulerJob).filter(SchedulerJob.job_key == job_key).first()
        if not exists:
            db.add(SchedulerJob(job_key=job_key, job_type=job_type, cron_expr=cron_expr, enabled=True, config_json=config_json))
    db.commit()


def list_scheduler_jobs(db: Session) -> list[SchedulerJob]:
    return db.query(SchedulerJob).order_by(SchedulerJob.job_key.asc()).all()


def list_scheduler_runs(db: Session, job_key: Optional[str] = None) -> list[SchedulerRun]:
    q = db.query(SchedulerRun).join(SchedulerJob, SchedulerRun.scheduler_job_id == SchedulerJob.id)
    if job_key:
        q = q.filter(SchedulerJob.job_key == job_key)
    return q.order_by(SchedulerRun.started_at.desc()).all()


def list_report_jobs(db: Session) -> list[ReportJob]:
    return db.query(ReportJob).order_by(ReportJob.created_at.desc()).all()


def list_report_artifacts(db: Session, job_id: Optional[str] = None) -> list[ReportArtifact]:
    q = db.query(ReportArtifact).join(ReportJob, ReportArtifact.report_job_id == ReportJob.id)
    if job_id:
        q = q.filter(ReportJob.job_id == job_id)
    return q.order_by(ReportArtifact.created_at.desc()).all()


def create_dashboard_snapshot(db: Session, scope: str, summary_json: dict) -> DashboardSnapshot:
    row = DashboardSnapshot(
        snapshot_id=f"dash_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        scope=scope,
        window_start=datetime.utcnow(),
        window_end=datetime.utcnow(),
        summary_json=summary_json,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
