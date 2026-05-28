"""Scheduler and report read/write APIs."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..models.production import SchedulerJob
from ..services.audit import record_audit_event
from ..services.jobs import create_scheduler_run, finalize_scheduler_run
from ..services.read_models import (
    create_default_scheduler_jobs,
    list_report_artifacts,
    list_report_jobs,
    list_scheduler_jobs,
    list_scheduler_runs,
)

router = APIRouter(prefix="/api/ops", tags=["ops"])


class SchedulerJobUpdate(BaseModel):
    enabled: Optional[bool] = Field(None, description="Enable or disable the scheduler job")
    cron_expr: Optional[str] = Field(None, description="Updated cron expression")
    config_json: Optional[dict] = Field(None, description="Updated job config")


class TriggerResponse(BaseModel):
    run_id: str
    job_key: str
    status: str
    message: Optional[str] = None


@router.get("/scheduler/jobs")
def get_scheduler_jobs(db: Session = Depends(get_db)):
    create_default_scheduler_jobs(db)
    rows = list_scheduler_jobs(db)
    return [
        {
            "job_key": row.job_key,
            "job_type": row.job_type,
            "cron_expr": row.cron_expr,
            "enabled": row.enabled,
            "config_json": row.config_json,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.get("/scheduler/runs")
def get_scheduler_runs(job_key: Optional[str] = Query(None), db: Session = Depends(get_db)):
    rows = list_scheduler_runs(db, job_key=job_key)
    return [
        {
            "run_id": row.run_id,
            "scheduler_job_id": row.scheduler_job_id,
            "started_at": row.started_at,
            "finished_at": row.finished_at,
            "status": row.status,
            "message": row.message,
        }
        for row in rows
    ]


@router.get("/reports/jobs")
def get_report_jobs(db: Session = Depends(get_db)):
    rows = list_report_jobs(db)
    return [
        {
            "job_id": row.job_id,
            "scope_type": row.scope_type,
            "scope_ref": row.scope_ref,
            "period": row.period,
            "status": row.status,
            "failure_code": row.failure_code,
            "failure_detail": row.failure_detail,
            "requested_by": row.requested_by,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/reports/artifacts")
def get_report_artifacts(job_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    rows = list_report_artifacts(db, job_id=job_id)
    return [
        {
            "artifact_id": row.artifact_id,
            "report_job_id": row.report_job_id,
            "format": row.format,
            "storage_uri": row.storage_uri,
            "checksum": row.checksum,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.put("/scheduler/jobs/{job_key}")
def update_scheduler_job(job_key: str, payload: SchedulerJobUpdate, actor: str = "admin", db: Session = Depends(get_db)):
    job = db.query(SchedulerJob).filter(SchedulerJob.job_key == job_key).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Scheduler job '{job_key}' not found")

    if payload.enabled is not None:
        job.enabled = payload.enabled
    if payload.cron_expr is not None:
        job.cron_expr = payload.cron_expr
    if payload.config_json is not None:
        job.config_json = payload.config_json

    record_audit_event(
        db,
        event_type="scheduler_job_updated",
        actor=actor,
        target_type="scheduler_job",
        target_id=job_key,
        payload_json={"enabled": payload.enabled, "cron_expr": payload.cron_expr},
    )
    db.commit()

    return {
        "job_key": job.job_key,
        "job_type": job.job_type,
        "cron_expr": job.cron_expr,
        "enabled": job.enabled,
        "config_json": job.config_json,
        "updated_at": job.updated_at,
    }


@router.post("/scheduler/jobs/{job_key}/trigger", response_model=TriggerResponse)
def trigger_scheduler_job(job_key: str, actor: str = "admin", db: Session = Depends(get_db)):
    job = db.query(SchedulerJob).filter(SchedulerJob.job_key == job_key).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Scheduler job '{job_key}' not found")

    run = create_scheduler_run(db, job.id)
    record_audit_event(
        db,
        event_type="scheduler_job_triggered",
        actor=actor,
        target_type="scheduler_job",
        target_id=job_key,
        payload_json={"run_id": run.run_id},
    )
    db.commit()

    msg = None
    status = "completed"
    try:
        if job.job_type == "assessment":
            from ..data.runtime_provider import get_runtime_source_manager
            from ..services.assessment.engine import assess_loop
            query_result = get_runtime_source_manager().resolve_loop_data(hours=job.config_json.get("window_hours", 1), seed=42)
            count = len(query_result.loops)
            for ld in query_result.loops:
                assess_loop(pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode, tag_name=ld.config.tag_name, unit=ld.config.unit, sample_interval=float(ld.config.sample_interval))
            msg = f"Assessed {count} loops"
        elif job.job_type == "report":
            msg = "Report generation triggered — check /api/ops/reports/jobs for status"
        else:
            status = "failed"
            msg = f"Unknown job type: {job.job_type}"
    except Exception as exc:
        status = "failed"
        msg = str(exc)

    finalize_scheduler_run(db, run, status=status, message=msg)
    db.commit()

    return TriggerResponse(run_id=run.run_id, job_key=job_key, status=status, message=msg)
