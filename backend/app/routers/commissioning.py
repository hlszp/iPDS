"""Commissioning API — CSV import, template export, loop validation."""

import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..data.database import get_db
from ..models.loop import LoopTag
from ..services.commissioning.engine import export_template, import_from_csv, validate_loops

router = APIRouter(prefix="/api/commissioning", tags=["commissioning"])


@router.get("/template")
def download_template():
    """Download a CSV template for loop tag import."""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        export_template(tmp.name)
        return FileResponse(tmp.name, media_type="text/csv", filename="loop_import_template.csv",
                            background=lambda: os.unlink(tmp.name))


@router.post("/import")
def import_csv(file: UploadFile, unit: str, db: Session = Depends(get_db)):
    """Import loop tags from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="请上传 CSV 文件")

    content = file.file.read()
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(content)
        tmp.flush()
        result = import_from_csv(tmp.name, unit)
        os.unlink(tmp.name)

    imported = result.get("imported", 0)
    if imported > 0:
        file.file.seek(0)
        content2 = file.file.read()
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp2:
            tmp2.write(content2)
            tmp2.flush()
            import csv as csv_module
            with open(tmp2.name, newline="", encoding="utf-8-sig") as f:
                reader = csv_module.DictReader(f)
                for row in reader:
                    tag = (row.get("tag_name") or "").strip()
                    if not tag:
                        continue
                    if db.query(LoopTag).filter(LoopTag.tag_name == tag).first():
                        continue
                    db.add(LoopTag(
                        tag_name=tag,
                        unit=unit,
                        loop_type=(row.get("loop_type") or "OTHER").strip(),
                        description=(row.get("description") or "").strip(),
                        pv_tag=(row.get("pv_tag") or f"{tag}.PV").strip(),
                        sp_tag=(row.get("sp_tag") or f"{tag}.SP").strip(),
                        op_tag=(row.get("op_tag") or f"{tag}.OP").strip(),
                        mode_tag=(row.get("mode_tag") or f"{tag}.MODE").strip(),
                        eng_unit=(row.get("eng_unit") or "").strip() or None,
                        pv_lo=float(row["pv_lo"]) if row.get("pv_lo") and str(row["pv_lo"]).strip() else None,
                        pv_hi=float(row["pv_hi"]) if row.get("pv_hi") and str(row["pv_hi"]).strip() else None,
                        sample_interval=int(row["sample_interval"]) if row.get("sample_interval") and str(row["sample_interval"]).strip() else 1,
                    ))
            os.unlink(tmp2.name)
        db.commit()

    return result


@router.get("/validate")
def validate(unit: Optional[str] = Query(None)):
    """Validate loop configurations and return warnings."""
    return validate_loops(unit=unit)


@router.get("/readiness")
def readiness(unit: Optional[str] = Query(None)):
    """Summarize whether commissioning is ready for assessment and tuning workflows."""
    result = validate_loops(unit=unit)
    total = result["total"]
    valid = result["valid"]
    warning_count = len(result["warnings"])

    if total == 0:
        return {
            "status": "empty",
            "total": 0,
            "valid": 0,
            "warning_count": 0,
            "message": "尚未配置任何回路，请先导入或新增回路位号。",
            "next_action": "config",
        }

    if warning_count > 0:
        return {
            "status": "incomplete",
            "total": total,
            "valid": valid,
            "warning_count": warning_count,
            "message": f"已有 {total} 条回路配置，但仍有 {warning_count} 项关键字段或量程问题需要补全。",
            "next_action": "commissioning",
        }

    return {
        "status": "ready",
        "total": total,
        "valid": valid,
        "warning_count": 0,
        "message": f"已完成 {total} 条回路配置，可进入驾驶舱查看评估与诊断结果。",
        "next_action": "dashboard",
    }
