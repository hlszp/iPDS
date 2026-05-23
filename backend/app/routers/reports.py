"""Report API — PDF generation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..auth.dependencies import get_current_user
from ..services.reporting.engine import _WEASYPRINT, generate_batch_report, generate_loop_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

_MEDIA = "application/pdf" if _WEASYPRINT else "text/html"


@router.get("/loop/{tag_name}")
def report_loop(tag_name: str, user=Depends(get_current_user)):
    """Generate a single-loop assessment PDF report."""
    # In production, fetch real assessment + diagnosis data
    try:
        pdf = generate_loop_report(
            assessment=None,  # placeholder — wire to real data
            diagnosis=None,
        )
        return Response(content=pdf, media_type=_MEDIA,
                        headers={"Content-Disposition": f'attachment; filename="{tag_name}_report.pdf"'})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")


@router.get("/batch")
def report_batch(
    unit: str = Query("全厂"),
    period: str = Query("日报"),
    user=Depends(get_current_user),
):
    """Generate a batch assessment PDF report."""
    try:
        pdf = generate_batch_report([], unit_name=unit, period=period)
        return Response(content=pdf, media_type=_MEDIA,
                        headers={"Content-Disposition": f'attachment; filename="{unit}_{period}.pdf"'})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成失败: {e}")
