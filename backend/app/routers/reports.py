"""Report API — PDF generation endpoints."""

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..auth.dependencies import get_current_user
from ..data.loop_cache import get_all_loop_data, get_loop_data
from ..services.assessment.engine import assess_loop
from ..services.diagnosis.engine import diagnose_loop
from ..services.reporting.engine import _WEASYPRINT, generate_batch_report, generate_loop_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

_MEDIA = "application/pdf" if _WEASYPRINT else "text/html; charset=utf-8"
_EXTENSION = "pdf" if _WEASYPRINT else "html"


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


@router.get("/loop/{tag_name}")
def report_loop(tag_name: str, user=Depends(get_current_user)):
    """Generate a single-loop assessment PDF report with real engine data."""
    try:
        ld = get_loop_data(tag_name, hours=24, seed=42)
        if ld is None:
            raise HTTPException(status_code=404, detail=f"Loop '{tag_name}' not found")

        assessment = assess_loop(
            pv=ld.pv, sp=ld.sp, op=ld.op, mode=ld.mode,
            tag_name=tag_name, unit=ld.config.unit,
            sample_interval=float(ld.config.sample_interval),
        )

        diagnosis = diagnose_loop(tag_name, ld.pv, ld.sp, ld.op)

        pdf = generate_loop_report(assessment=assessment, diagnosis=diagnosis)
        return Response(
            content=pdf,
            media_type=_MEDIA,
            headers=_report_headers(f"{tag_name}_评估报告"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")


@router.get("/batch")
def report_batch(
    unit: str = Query("全厂"),
    period: str = Query("日报"),
    user=Depends(get_current_user),
):
    """Generate a batch assessment PDF report for all loops or a specific unit."""
    try:
        all_data = get_all_loop_data(hours=24, seed=42)

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
            raise HTTPException(status_code=404, detail=f"No loops found for unit '{unit}'")

        pdf = generate_batch_report(assessments, unit_name=unit, period=period)
        return Response(
            content=pdf,
            media_type=_MEDIA,
            headers=_report_headers(f"{unit}_{period}"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")
