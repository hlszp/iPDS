import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

function getFilenameFromDisposition(header) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || null;
}

async function openReport(res, fallbackName) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const filename = getFilenameFromDisposition(res.headers.get('content-disposition')) || fallbackName;
  const reportFormat = res.headers.get('x-report-format') || (res.headers.get('content-type')?.includes('html') ? 'html' : 'pdf');

  if (reportFormat === 'html') {
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { mode: 'preview', filename, reportFormat };
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { mode: 'download', filename, reportFormat };
}

export default function Reports() {
  const [tab, setTab] = useState('single');
  const [loops, setLoops] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [unit, setUnit] = useState('全厂');
  const [period, setPeriod] = useState('日报');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.listLoops({ limit: 500 }).then(setLoops).catch(() => setLoops([]));
  }, []);

  const units = useMemo(() => ['全厂', ...new Set(loops.map((item) => item.unit).filter(Boolean))], [loops]);

  const generateSingle = async () => {
    if (!selectedTag) return;
    setStatus({ type: 'loading', title: '正在生成单回路报告', detail: '系统正在拉取评估结果并输出正式报表。' });
    try {
      const res = await api.generateLoopReport(selectedTag);
      const result = await openReport(res, `${selectedTag}_评估报告.html`);
      setStatus({
        type: 'ok',
        title: result.mode === 'preview' ? '已打开报告预览' : '已下载报告文件',
        detail: `${result.filename} · ${result.reportFormat === 'html' ? 'HTML 预览' : 'PDF 下载'}`,
      });
    } catch (error) {
      setStatus({ type: 'err', title: '单回路报告生成失败', detail: error.message || '报告生成失败' });
    }
  };

  const generateBatch = async () => {
    setStatus({ type: 'loading', title: '正在生成批量报告', detail: '系统正在汇总选定范围内的回路评估结果。' });
    try {
      const res = await api.generateBatchReport(unit, period);
      const result = await openReport(res, `${unit}_${period}.html`);
      setStatus({
        type: 'ok',
        title: result.mode === 'preview' ? '已打开批量报告预览' : '已下载批量报告文件',
        detail: `${result.filename} · ${result.reportFormat === 'html' ? 'HTML 预览' : 'PDF 下载'}`,
      });
    } catch (error) {
      setStatus({ type: 'err', title: '批量报告生成失败', detail: error.message || '报告生成失败' });
    }
  };

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="可选回路" value={loops.length} detail="单回路报告候选数量" />
        <MetricCard label="装置范围" value={Math.max(units.length - 1, 0)} detail="支持批量报告的装置数" />
        <MetricCard label="输出形态" value="PDF / HTML" detail="WeasyPrint 可用时输出 PDF，否则回退为 HTML 预览" />
        <MetricCard label="当前模式" value={tab === 'single' ? '单回路' : '批量'} detail="正式产品交付入口" />
      </section>

      <div style={st.tabs}>
        <button onClick={() => setTab('single')} style={{ ...st.tab, ...(tab === 'single' ? st.tabActive : null) }}>单回路报告</button>
        <button onClick={() => setTab('batch')} style={{ ...st.tab, ...(tab === 'batch' ? st.tabActive : null) }}>批量报告</button>
      </div>

      <section style={st.contentGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>{tab === 'single' ? '单回路正式报告' : '批量正式报告'}</div>
              <div style={st.panelSub}>保留真实输出语义，不伪造任务进度或报表产物列表。</div>
            </div>
          </div>

          <div style={st.formBody}>
            {tab === 'single' ? (
              <>
                <Field label="选择回路" hint="进入单回路评估报告生成流程。">
                  <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={st.select}>
                    <option value="">— 请选择 —</option>
                    {loops.map((loop) => <option key={loop.tag_name} value={loop.tag_name}>{loop.tag_name} · {loop.unit}</option>)}
                  </select>
                </Field>
                <button onClick={generateSingle} disabled={!selectedTag} style={{ ...st.primaryBtn, ...(selectedTag ? null : st.disabledBtn) }}>生成单回路报告</button>
              </>
            ) : (
              <>
                <Field label="装置范围" hint="全厂或单装置批量评估报告。">
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} style={st.select}>
                    {units.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="报告周期" hint="用于周报、月报等管理视角导出。">
                  <select value={period} onChange={(e) => setPeriod(e.target.value)} style={st.select}>
                    {['日报', '周报', '月报'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <button onClick={generateBatch} style={st.primaryBtn}>生成批量报告</button>
              </>
            )}
          </div>
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>输出语义</div>
                <div style={st.panelSub}>向客户说明当前交付形态与回退规则</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>服务端优先生成 PDF；若本地未安装 WeasyPrint 依赖，则自动回退为 HTML 预览。</p>
              <p>当前页面仅展示真实生成结果，不展示伪作业队列、不伪造历史产物。</p>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>当前状态</div>
                <div style={st.panelSub}>明确显示成功、失败与输出方式</div>
              </div>
            </div>
            {status ? (
              <div style={st.statusCard(status.type)}>
                <div style={st.statusTitle}>{status.title}</div>
                <div style={st.statusDetail}>{status.detail}</div>
              </div>
            ) : (
              <div style={st.textBody}><p>尚未触发报告生成。</p></div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={st.field}>
      <label style={st.fieldLabel}>{label}</label>
      <div style={st.fieldHint}>{hint}</div>
      {children}
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div style={st.metricCard}>
      <div style={st.metricLabel}>{label}</div>
      <div style={st.metricValue}>{value}</div>
      <div style={st.metricDetail}>{detail}</div>
    </div>
  );
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  metricLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  metricValue: { fontSize: 30, fontWeight: 800, color: 'var(--text-strong)' },
  metricDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' },
  tabs: { display: 'flex', gap: 10 },
  tab: { height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)', fontWeight: 600 },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 340px', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  formBody: { padding: 18, display: 'grid', gap: 16 },
  field: { display: 'grid', gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' },
  fieldHint: { fontSize: 12, color: 'var(--text-subtle)' },
  select: { width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 12px' },
  primaryBtn: { height: 42, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700 },
  disabledBtn: { opacity: 0.5, cursor: 'default' },
  textBody: { padding: 18, display: 'grid', gap: 10, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8 },
  statusCard: (type) => ({ margin: 18, padding: 16, borderRadius: 14, border: `1px solid ${type === 'err' ? '#fca5a5' : type === 'ok' ? '#86efac' : '#fcd34d'}`, background: type === 'err' ? '#fef2f2' : type === 'ok' ? '#f0fdf4' : '#fffbeb' }),
  statusTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' },
  statusDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.7 },
};
