"""T13: Commissioning — loop metadata import and initial configuration wizard.

Handles the critical Day-1 workflow:
1. Import loop tags from DCS point list (CSV)
2. Validate metadata completeness
3. Bootstrap baseline assessment
"""

import csv
import json
from pathlib import Path
from typing import Optional

from ...data.database import SessionLocal
from ...models.loop import LoopTag


def import_from_csv(path: Path, unit: str) -> dict:
    """Import loop tags from a DCS point list CSV.

    Expected columns: tag_name, loop_type, description, pv_tag, sp_tag, op_tag,
                      mode_tag, eng_unit, pv_lo, pv_hi, sample_interval

    Returns: {imported: N, skipped: N, errors: [msg, ...]}
    """
    result = {"imported": 0, "skipped": 0, "errors": []}
    db = SessionLocal()
    try:
        with open(path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 1):
                try:
                    tag = row.get("tag_name", "").strip()
                    if not tag:
                        result["skipped"] += 1
                        continue

                    existing = db.query(LoopTag).filter(LoopTag.tag_name == tag).first()
                    if existing:
                        result["skipped"] += 1
                        continue

                    loop = LoopTag(
                        tag_name=tag,
                        unit=unit,
                        loop_type=row.get("loop_type", "OTHER").strip() or "OTHER",
                        description=row.get("description", "").strip() or None,
                        pv_tag=row.get("pv_tag", "").strip() or tag + ".PV",
                        sp_tag=row.get("sp_tag", "").strip() or tag + ".SP",
                        op_tag=row.get("op_tag", "").strip() or tag + ".OP",
                        mode_tag=row.get("mode_tag", "").strip() or None,
                        eng_unit=row.get("eng_unit", "").strip() or None,
                        pv_lo=_parse_float(row.get("pv_lo")),
                        pv_hi=_parse_float(row.get("pv_hi")),
                        sample_interval=_parse_int(row.get("sample_interval"), 1),
                        feedforward_tags=json.dumps([]),
                    )
                    db.add(loop)
                    result["imported"] += 1
                except Exception as e:
                    result["errors"].append(f"Row {i}: {e}")
        db.commit()
    finally:
        db.close()
    return result


def validate_loops(unit: Optional[str] = None) -> dict:
    """Check all configured loops for missing or suspicious metadata.

    Returns: {total, valid, warnings: [{tag, field, value, issue}, ...]}
    """
    db = SessionLocal()
    warnings = []
    try:
        q = db.query(LoopTag)
        if unit:
            q = q.filter(LoopTag.unit == unit)
        loops = q.all()
        for l in loops:
            if not l.pv_tag:
                warnings.append({"tag": l.tag_name, "field": "pv_tag", "value": "", "issue": "PV位号缺失"})
            if not l.sp_tag:
                warnings.append({"tag": l.tag_name, "field": "sp_tag", "value": "", "issue": "SP位号缺失"})
            if l.pv_lo is not None and l.pv_hi is not None and l.pv_lo >= l.pv_hi:
                warnings.append({"tag": l.tag_name, "field": "pv_range", "value": f"{l.pv_lo}-{l.pv_hi}", "issue": "PV量程下限≥上限"})
            if l.sample_interval and l.sample_interval <= 0:
                warnings.append({"tag": l.tag_name, "field": "sample_interval", "value": str(l.sample_interval), "issue": "采样周期无效"})
        return {"total": len(loops), "valid": len(loops) - len(warnings), "warnings": warnings}
    finally:
        db.close()


def export_template(path: Path):
    """Generate an empty CSV template for loop tag import."""
    columns = ["tag_name", "loop_type", "description", "pv_tag", "sp_tag", "op_tag", "mode_tag", "eng_unit", "pv_lo", "pv_hi", "sample_interval"]
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        writer.writerow(["FIC-10001", "FLOW", "进料流量控制", "FIC10001.PV", "FIC10001.SP", "FIC10001.OP", "FIC10001.MODE", "t/h", "0", "100", "1"])


def _parse_float(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return None


def _parse_int(v, default=1) -> int:
    try:
        return int(float(str(v).strip()))
    except (ValueError, TypeError):
        return default
