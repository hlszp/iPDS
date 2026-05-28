"""T11: PDF Report Generator — GB/T 44693.2-2024 compliant reports.

NOTE: Requires WeasyPrint (pip install weasyprint).
On systems without WeasyPrint, reports return HTML instead of PDF.
"""

import io
from datetime import datetime
from typing import Optional

try:
    from weasyprint import HTML
    _WEASYPRINT = True
except Exception:
    _WEASYPRINT = False

from ..assessment.engine import LoopAssessment
from ..diagnosis.engine import DiagnosisResult


def generate_loop_report(
    assessment: LoopAssessment,
    diagnosis: Optional[DiagnosisResult] = None,
    trend_svg: Optional[str] = None,
) -> bytes:
    """Generate a single-loop assessment PDF report."""
    grade_color = {
        "优": "#2ecc71", "良": "#3498db", "中": "#f1c40f", "差": "#e74c3c", "开环": "#7f8c8d",
    }.get(assessment.grade, "#7f8c8d")

    diag_html = ""
    if diagnosis:
        diag_html = f"""
        <div class="section">
            <h3>故障诊断结果</h3>
            <table>
                <tr><td>主要故障</td><td><strong>{_fault_label(diagnosis.primary_fault)}</strong></td></tr>
                <tr><td>阀门粘滞</td><td>{'是' if diagnosis.stiction_detected else '否'}（置信度 {diagnosis.stiction_confidence:.0%}）</td></tr>
                <tr><td>振荡</td><td>{'是' if diagnosis.oscillation_detected else '否'}（置信度 {diagnosis.oscillation_confidence:.0%}）</td></tr>
                <tr><td>非线性度</td><td>{diagnosis.nonlinearity_degree:.3f}</td></tr>
                <tr><td>回路耦合</td><td>{', '.join(diagnosis.coupling_candidates) if diagnosis.coupling_candidates else '无'}</td></tr>
            </table>
        </div>"""

    trend_html = ""
    if trend_svg:
        trend_html = f'<div class="section"><h3>趋势图</h3><div style="text-align:center">{trend_svg}</div></div>'

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 2cm; @bottom-center {{ content: "PDS 报告系统 · " counter(page) "/" counter(pages); font-size:9px; color:#999; }} }}
  body {{ font-family: "PingFang SC","Microsoft YaHei",sans-serif; font-size:12px; color:#333; line-height:1.6; }}
  .cover {{ text-align:center; padding-top:120px; }}
  .cover h1 {{ font-size:28px; margin-bottom:8px; }}
  .cover .subtitle {{ font-size:16px; color:#666; margin-bottom:40px; }}
  .cover .meta {{ font-size:12px; color:#999; }}
  .section {{ margin-top:24px; }}
  .section h3 {{ font-size:14px; border-bottom:2px solid #333; padding-bottom:4px; margin-bottom:12px; }}
  table {{ width:100%; border-collapse:collapse; font-size:11px; }}
  td {{ padding:6px 8px; border-bottom:1px solid #eee; }}
  td:first-child {{ color:#666; width:140px; }}
  .kpi-row {{ display:flex; gap:12px; margin-bottom:12px; }}
  .kpi-box {{ flex:1; padding:12px; border-radius:6px; text-align:center; background:#f8f9fa; }}
  .kpi-box .val {{ font-size:24px; font-weight:700; }}
  .kpi-box .lbl {{ font-size:10px; color:#999; margin-top:4px; }}
  .grade-badge {{ display:inline-block; padding:4px 16px; border-radius:12px; color:#fff; font-weight:700; font-size:14px; background:{grade_color}; }}
  .footer {{ margin-top:32px; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:8px; }}
</style></head>
<body>
  <div class="cover">
    <h1>PID 回路性能评估报告</h1>
    <div class="subtitle">符合 GB/T 44693.2-2024 标准</div>
    <div class="meta">
      <p>位号: <strong>{assessment.tag_name}</strong></p>
      <p>装置: {assessment.unit}</p>
      <p>评估时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
    </div>
  </div>

  <div class="section">
    <h3>综合评估</h3>
    <div style="text-align:center;margin:16px 0;"><span class="grade-badge">{assessment.grade}</span></div>
    <div class="kpi-row">
      <div class="kpi-box"><div class="val" style="color:{grade_color}">{assessment.performance_score:.1f}</div><div class="lbl">性能评分</div></div>
      <div class="kpi-box"><div class="val">{assessment.stability_rate:.1f}%</div><div class="lbl">控制平稳率</div></div>
      <div class="kpi-box"><div class="val">{assessment.self_control_rate:.1f}%</div><div class="lbl">自控率</div></div>
    </div>
    <table>
      <tr><td>IAE（归一化）</td><td>{assessment.iae:.4f}</td></tr>
      <tr><td>振荡指数</td><td>{assessment.oscillation_index:.3f}</td></tr>
      <tr><td>阀门饱和率</td><td>{assessment.valve_saturation_rate:.1%}</td></tr>
      <tr><td>操作频次</td><td>{assessment.operation_frequency:.1f} 次/小时</td></tr>
      <tr><td>非线性度</td><td>{assessment.nonlinearity_degree:.3f}</td></tr>
    </table>
  </div>

  {diag_html}
  {trend_html}

  <div class="footer">
    <p>本报告由 PDS 系统自动生成。整定建议仅供参考，请在 DCS 中手动输入参数并验证。</p>
    <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 软件版本: 0.1.0</p>
  </div>
</body></html>"""
    if not _WEASYPRINT:
        return html.encode("utf-8")
    return HTML(string=html).write_pdf()


def generate_batch_report(
    assessments: list[LoopAssessment],
    unit_name: str = "全厂",
    period: str = "日报",
) -> bytes:
    """Generate a batch assessment report for multiple loops."""
    rows = ""
    for a in assessments:
        gc = {"优": "#2ecc71", "良": "#3498db", "中": "#f1c40f", "差": "#e74c3c", "开环": "#7f8c8d"}.get(a.grade, "#7f8c8d")
        rows += f"""<tr>
            <td>{a.tag_name}</td><td>{a.unit}</td>
            <td style="color:{gc};font-weight:700;">{a.grade}</td>
            <td>{a.stability_rate:.1f}%</td><td>{a.self_control_rate:.1f}%</td>
            <td>{a.performance_score:.1f}</td><td>{a.oscillation_index:.2f}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 1.5cm; }}
  body {{ font-family: "PingFang SC","Microsoft YaHei",sans-serif; font-size:10px; color:#333; }}
  h1 {{ font-size:18px; margin-bottom:4px; }}
  .subtitle {{ color:#666; font-size:11px; margin-bottom:16px; }}
  table {{ width:100%; border-collapse:collapse; }}
  th {{ background:#f0f0f0; padding:6px 8px; text-align:left; border-bottom:2px solid #ccc; font-weight:600; }}
  td {{ padding:5px 8px; border-bottom:1px solid #eee; }}
  tr:nth-child(even) {{ background:#fafafa; }}
  .summary {{ display:flex; gap:16px; margin-bottom:16px; }}
  .summary div {{ padding:8px 12px; background:#f8f9fa; border-radius:4px; }}
  .footer {{ margin-top:16px; font-size:9px; color:#999; border-top:1px solid #eee; padding-top:4px; }}
</style></head>
<body>
  <h1>{unit_name} · PID 回路性能{period}</h1>
  <div class="subtitle">生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M')} | 回路总数: {len(assessments)}</div>
  <div class="summary">
    <div>优: {sum(1 for a in assessments if a.grade=='优')}</div>
    <div>良: {sum(1 for a in assessments if a.grade=='良')}</div>
    <div>中: {sum(1 for a in assessments if a.grade=='中')}</div>
    <div>差: {sum(1 for a in assessments if a.grade=='差')}</div>
    <div>开环: {sum(1 for a in assessments if a.grade=='开环')}</div>
  </div>
  <table><thead><tr><th>位号</th><th>装置</th><th>评级</th><th>平稳率</th><th>自控率</th><th>评分</th><th>振荡指数</th></tr></thead><tbody>{rows}</tbody></table>
  <div class="footer">PDS 系统自动生成 · 符合 GB/T 44693.2-2024</div>
</body></html>"""
    if not _WEASYPRINT:
        return html.encode("utf-8")
    return HTML(string=html).write_pdf()


def _fault_label(fault: str) -> str:
    return {"stiction": "阀门粘滞", "oscillation": "持续振荡", "nonlinearity": "过程非线性", "coupling": "回路耦合", "none": "无明显故障"}.get(fault, fault)
