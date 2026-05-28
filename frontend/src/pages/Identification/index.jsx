import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

export default function Identification() {
  const [features, setFeatures] = useState([]);
  const [loops, setLoops] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [result, setResult] = useState(null);
  const [loadingId, setLoadingId] = useState(false);
  const [errorId, setErrorId] = useState('');

  useEffect(() => {
    api.listFeatures().then(items => setFeatures(items || [])).catch(() => setFeatures([]));
    api.listLoops({ limit: 500 }).then(items => setLoops(items || [])).catch(() => setLoops([]));
  }, []);

  const identFeature = features.find(f => f.key === 'identification');
  const featureReady = identFeature?.enabled;

  const runIdentification = async () => {
    if (!selectedTag) return;
    setLoadingId(true);
    setErrorId('');
    setResult(null);
    try {
      const data = await api.getIdentification(selectedTag);
      setResult(data);
    } catch (e) {
      setErrorId(e.message || '辨识失败');
    } finally {
      setLoadingId(false);
    }
  };

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="能力状态" value={featureReady ? '已启用' : '未启用'} detail="功能开关控制模块可用性" tone={featureReady ? 'ok' : 'neutral'} />
        <MetricCard label="后端引擎" value="已就绪" detail="FOPDT / ARX / 子空间法" tone="ok" />
        <MetricCard label="独立 API" value="已上线" detail="GET /api/identification/{tag}" tone="ok" />
        <MetricCard label="候选回路" value={loops.length} detail="可用运行时数据的回路数" tone="ok" />
      </section>

      <div style={st.banner(featureReady ? 'ok' : 'neutral')}>
        <div>功能开关：<strong>{featureReady ? '已启用' : '未启用'}</strong></div>
        <div>后端引擎：<strong>FOPDT · ARX · 子空间</strong></div>
        <div>API：<strong>GET /api/identification/{'{tag_name}'}</strong></div>
        <div style={st.bannerDetail}>选择回路后运行辨识，获取过程模型参数与候选对比。</div>
      </div>

      <section style={st.contentGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>系统辨识</div>
              <div style={st.panelSub}>选择回路并运行辨识，查看 FOPDT 模型参数与候选对比。</div>
            </div>
          </div>

          <div style={st.formRow}>
            <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} style={st.select}>
              <option value="">— 选择回路 —</option>
              {loops.map(loop => <option key={loop.tag_name} value={loop.tag_name}>{loop.tag_name} · {loop.unit}</option>)}
            </select>
            <button onClick={runIdentification} disabled={!selectedTag || loadingId} style={{ ...st.primaryBtn, ...(selectedTag && !loadingId ? null : st.disabledBtn) }}>运行辨识</button>
          </div>

          {loadingId && <div style={st.state}>正在运行系统辨识...</div>}
          {errorId && <div style={st.errBanner}>{errorId}</div>}

          {result && (
            <div style={{ padding: '0 18px 18px' }}>
              <div style={st.metricsRow}>
                <IdCard label="激励指数" value={result.excitation_index} suffix={` — ${result.excitation_sufficient ? '充足' : '不足'}`} tone={result.excitation_sufficient ? 'ok' : 'warn'} />
                <IdCard label="模型方法" value={result.best_model.method} suffix="" tone="neutral" />
                <IdCard label="增益 K" value={result.best_model.gain.toFixed(4)} suffix="" tone="neutral" />
                <IdCard label="时间常数 τ" value={`${result.best_model.tau.toFixed(1)}s`} suffix="" tone="neutral" />
                <IdCard label="纯滞后 θ" value={`${result.best_model.dead_time.toFixed(1)}s`} suffix="" tone="neutral" />
                <IdCard label="拟合优度 R²" value={result.best_model.r_squared.toFixed(3)} suffix="" tone={result.best_model.r_squared >= 0.7 ? 'ok' : 'warn'} />
              </div>

              {result.fallback_reason && (
                <div style={st.fallbackNote}>备注：{result.fallback_reason}</div>
              )}

              {result.candidates.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={st.panelTitle}>模型候选对比</div>
                  <table style={st.table}>
                    <thead><tr>{['方法', 'K', 'τ (s)', 'θ (s)', 'R²', '激励指数'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {result.candidates.map((c, i) => (
                        <tr key={i} style={st.row}>
                          <td style={st.tdStrong}>{c.method}</td>
                          <td style={st.td}>{c.gain.toFixed(4)}</td>
                          <td style={st.td}>{c.tau.toFixed(1)}</td>
                          <td style={st.td}>{c.dead_time.toFixed(1)}</td>
                          <td style={st.td}>{c.r_squared.toFixed(3)}</td>
                          <td style={st.td}>{c.excitation_index.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>使用说明</div>
                <div style={st.panelSub}>辨识结果对整定与仿真的影响</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>辨识提取的过程模型参数（K, τ, θ）是 PID 整定与闭环仿真的前置输入。</p>
              <p>激励指数低于 0.5 时辨识结果可能不可靠，建议在回路中引入小幅设定值阶跃后再试。</p>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>后续计划</div>
                <div style={st.panelSub}>Phase 4+ 补齐的能力</div>
              </div>
            </div>
            <div style={st.textBody}>
              <ul style={st.list}>
                <li>激励窗口选择与手动标注</li>
                <li>模型候选可视化对比</li>
                <li>历史辨识结果查询与对比</li>
                <li>参数导出到整定工作台</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone }) {
  return (
    <div style={st.metricCard}>
      <div style={st.metricLabel}>{label}</div>
      <div style={{ ...st.metricValue, ...(tone === 'ok' ? { color: 'var(--green-strong)' } : tone === 'warn' ? { color: 'var(--amber-strong)' } : { color: 'var(--text-strong)' }) }}>{value}</div>
      <div style={st.metricDetail}>{detail}</div>
    </div>
  );
}

function IdCard({ label, value, suffix, tone }) {
  return (
    <div style={st.idCard}>
      <div style={st.idLabel}>{label}</div>
      <div style={{ ...st.idValue, ...(tone === 'ok' ? { color: 'var(--green-strong)' } : tone === 'warn' ? { color: 'var(--amber-strong)' } : { color: 'var(--text-strong)' }) }}>{value}<span style={st.idSuffix}>{suffix}</span></div>
    </div>
  );
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  metricLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  metricValue: { fontSize: 30, fontWeight: 800 },
  metricDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' },
  banner: (tone) => ({ padding: '12px 14px', borderRadius: 14, border: `1px solid ${tone === 'warn' ? '#fcd34d' : '#86efac'}`, background: tone === 'warn' ? '#fffbeb' : '#f0fdf4', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, auto)) 1fr', gap: 12, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }),
  bannerDetail: { minWidth: 0 },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 320px', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 8 },
  panelSub: { fontSize: 12, color: 'var(--text-subtle)' },
  formRow: { padding: 18, display: 'flex', gap: 12, alignItems: 'center' },
  select: { flex: 1, height: 42, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 12px' },
  primaryBtn: { height: 42, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700 },
  disabledBtn: { opacity: 0.5, cursor: 'default' },
  state: { padding: 24, color: 'var(--text-subtle)' },
  errBanner: { margin: '0 18px 18px', padding: '12px 14px', borderRadius: 12, border: '1px solid #fca5a5', background: '#fef2f2', color: 'var(--text-subtle)', fontSize: 13 },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  idCard: { background: 'var(--panel-muted)', borderRadius: 12, padding: 14, border: '1px solid var(--line)' },
  idLabel: { fontSize: 11, color: 'var(--text-subtle)', marginBottom: 8 },
  idValue: { fontSize: 22, fontWeight: 800 },
  idSuffix: { fontSize: 12, fontWeight: 400, marginLeft: 4, color: 'var(--text-subtle)' },
  fallbackNote: { padding: '12px 14px', borderRadius: 10, border: '1px solid #fcd34d', background: '#fffbeb', color: 'var(--text-muted)', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', color: 'var(--text-subtle)', fontWeight: 700, background: 'var(--panel-muted)', borderBottom: '1px solid var(--line)' },
  row: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '11px 12px', color: 'var(--text-subtle)' },
  tdStrong: { padding: '11px 12px', color: 'var(--text-strong)', fontWeight: 600 },
  textBody: { padding: 18, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8, display: 'grid', gap: 10 },
  list: { paddingLeft: 20, display: 'grid', gap: 6 },
};
