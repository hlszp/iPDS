"""Report API — PDF generation endpoints."""
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..auth.dependencies import get_current_user
from ..data.database import get_db
from ..data.runtime_provider import get_runtime_source_manager
from ..services.assessment.engine import assess_loop
from ..services.diagnosis.engine import diagnose_loop
from ..services.jobs import REPORT_FAILURES, create_report_artifact, create_report_job, finalize_report_job
from ..services.reporting.engine import _WEASYPRINT, generate_batch_report, generate_loop_report
from ..utils.exceptions import DataSourceError, IdentificationError, InsufficientDataError, TuningError

router = APIRouter(prefix="/api/reports", tags=["reports"])

_MEDIA = "application/pdf" if _WEASYPRINT else "text/html; charset=utf-8"
_EXTENSION = "pdf" if _WEASYPRINT else "html"


class ReportGenerationError(Exception):
    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _safe_filename(name: str) -> str:
    """Encode non-ASCII filename per RFC 5987."""
    ascii_name = "".join(c for c in name if c.isascii() and c.isalnum() or c in "_-.")
    return f"{ascii_name}.{_EXTENSION}" if ascii_name else f"report.{_EXTENSION}"


def _encode_content_disposition(filename: str) -> str:
    """Generate Content-Disposition header with UTF-8 filename."""
    safe = _safe_filename(filename)
    encoded = quote(filename, safe="")
    return f'attachment; filename="{safe}"; filename*=UTF-8\'\'{encoded}'


def _report_headers(filename: str) -> dict[str, str]:
    return {
        "Content-Disposition": _encode_content_disposition(filename),
        "X-Report-Format": _EXTENSION,
    }


def _fail_report_job(db, report_job, code: str, detail: str):
    finalize_report_job(db, report_job, "failed", failure_code=code, failure_detail=detail)
    db.commit()
    failure = REPORT_FAILURES[code]
    raise HTTPException(
        status_code=failure["status_code"],
        detail={"code": code, "message": failure["detail"], "job_id": report_job.job_id, "detail": detail},
    )


def _map_report_exception(exc: Exception):
    if isinstance(exc, DataSourceError):
        return "runtime_query_failed", str(exc)
    if isinstance(exc, (InsufficientDataError, IdentificationError, TuningError, ValueError)):
        return "assessment_failed", str(exc)
    if isinstance(exc, RuntimeError):
        return "report_render_failed", str(exc)
    return "report_render_failed", str(exc)


@router.get("/loop/{tag_name}")
def report_loop(tag_name: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate a single-loop assessment PDF report with real engine data."""
    report_job = create_report_job(db, scope_type="loop", scope_ref=tag_name, period="single", requested_by=user.username)
    try:
        query_result = get_runtime_source_manager().resolve_loop_data(db=db, hours=24, seed=42)
        ld = next((item for item in query_result.loops if item.config.tag_name == tag_name), None)
        if ld is None:
            _fail_report_job(db, report_job, "loop_not_found", f"Loop '{tag_name}' not found")

        assessment = assess_loop(
            pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
            tag_name=tag_name, unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
        )
        diagnosis = diagnose_loop(tag_name, ld.pv, ld.sp, ld.op)

        payload = generate_loop_report(assessment=assessment, diagnosis=diagnosis)
        filename = f"{tag_name}_评估报告"
        create_report_artifact(db, report_job.id, _EXTENSION, f"{filename}.{_EXTENSION}", payload)
        finalize_report_job(db, report_job, "completed")
        db.commit()
        return Response(content=payload, media_type=_MEDIA, headers=_report_headers(filename))
    except HTTPException:
        raise
    except Exception as exc:
        code, detail = _map_report_exception(exc)
        _fail_report_job(db, report_job, code, detail)


@router.get("/batch")
def report_batch(
    unit: str = Query("全厂"),
    period: str = Query("日报"),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Generate a batch assessment PDF report for all loops or a specific unit."""
    report_job = create_report_job(db, scope_type="unit", scope_ref=unit, period=period, requested_by=user.username)
    try:
        query_result = get_runtime_source_manager().resolve_loop_data(db=db, hours=24, seed=42)
        all_data = query_result.loops

        assessments = []
        for ld in all_data:
            if unit != "全厂" and ld.config.unit != unit:
                continue
            a = assess_loop(
                pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
                tag_name=ld.config.tag_name, unit=ld.config.unit,
                sample_interval=float(ld.config.sample_interval),
            )
            assessments.append(a)

        if not assessments:
            _fail_report_job(db, report_job, "unit_not_found", f"No loops found for unit '{unit}'")

        payload = generate_batch_report(assessments, unit_name=unit, period=period)
        filename = f"{unit}_{period}"
        create_report_artifact(db, report_job.id, _EXTENSION, f"{filename}.{_EXTENSION}", payload)
        finalize_report_job(db, report_job, "completed")
        db.commit()
        return Response(content=payload, media_type=_MEDIA, headers=_report_headers(filename))
    except HTTPException:
        raise
    except Exception as exc:
        code, detail = _map_report_exception(exc)
        _fail_report_job(db, report_job, code, detail)
