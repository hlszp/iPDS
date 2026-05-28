import { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function Simulation() {
  const [features, setFeatures] = useState([]);
  const [loops, setLoops] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [tagName, setTagName] = useState('');
  const [scenario, setScenario] = useState('step');
  const [method, setMethod] = useState('imc');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listFeatures().then(items => setFeatures(items || [])).catch(() => setFeatures([]));
    api.listLoops({ limit: 500 }).then(items => setLoops(items || [])).catch(() => setLoops([]));
    api.getSimulationScenarios().then(data => setScenarios(data.scenarios || [])).catch(() => setScenarios([]));
  }, []);

  const simFeature = features.find(f => f.key === 'simulation');
  const featureReady = simFeature?.enabled;

  const runSimulation = async () => {
    if (!tagName) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.runSimulation({ tag_name: tagName, scenario, method });
      setResult(data);
    } catch (e) {
      setError(e.message || '仿真失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="能力状态" value={featureReady ? '已启用' : '未启用'} detail="功能开关控制" tone={featureReady ? 'ok' : 'neutral'} />
        <MetricCard label="后端引擎" value="已就绪" detail="阶跃 · 扰动 · 粘滞" tone="ok" />
        <MetricCard label="独立 API" value="已上线" detail="POST /api/simulation/run" tone="ok" />
        <MetricCard label="场景数" value={scenarios.length} detail="可选仿真场景" tone="ok" />
      </section>

      <div style={st.banner(featureReady ? 'ok' : 'neutral')}>
        <div>功能开关：<strong>{featureReady ? '已启用' : '未启用'}</strong></div>
        <div>场景：<strong>{scenario} · 整定方法: {method}</strong></div>
        <div>API：<strong>POST /api/simulation/run {'{tag_name, scenario, method}'}</strong></div>
        <div style={st.bannerDetail}>选择回路、场景与整定方法后运行闭环仿真。</div>
      </div>

      <section style={st.contentGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>闭环仿真</div>
              <div style={st.panelSub}>对整定方案进行设定值阶跃、负荷扰动、阀门粘滞场景仿真。</div>
            </div>
          </div>

          <div style={st.formBody}>
            <div style={st.formRow}>
              <select value={tagName} onChange={(e) => setTagName(e.target.value)} style={st.select}>
                <option value="">— 选择回路 —</option>
                {loops.map(loop => <option key={loop.tag_name} value={loop.tag_name}>{loop.tag_name} · {loop.unit}</option>)}
              </select>
              <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={st.selectSmall}>
                {scenarios.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={st.selectSmall}>
                <option value="imc">IMC</option>
                <option value="lambda">Lambda</option>
                <option value="aggressive">Aggressive</option>
              </select>
              <button onClick={runSimulation} disabled={!tagName || loading} style={{ ...st.primaryBtn, ...(tagName && !loading ? null : st.disabledBtn) }}>运行仿真</button>
            </div>
          </div>

          {loading && <div style={st.state}>正在运行闭环仿真...</div>}
          {error && <div style={st.errBanner}>{error}</div>}

          {result && (
            <div style={{ padding: '0 18px 18px' }}>
              <div style={st.metricsRow}>
                <SimCard label="置信度" value={result.simulation_result.confidence_score} suffix={` — ${result.simulation_result.confidence_level}`} tone={result.simulation_result.confidence_level === 'high' ? 'ok' : result.simulation_result.confidence_level === 'medium' ? 'neutral' : 'warn'} />
                <SimCard label="超调量" value={`${result.simulation_result.overshoot_pct}%`} suffix="" tone={result.simulation_result.overshoot_pct < 20 ? 'ok' : 'warn'} />
                <SimCard label="调节时间" value={`${result.simulation_result.settling_time}s`} suffix="" tone="neutral" />
                <SimCard label="上升时间" value={`${result.simulation_result.rise_time}s`} suffix="" tone="neutral" />
                <SimCard label="稳态误差" value={`${result.simulation_result.steady_state_error}%`} suffix="" tone={result.simulation_result.steady_state_error < 2 ? 'ok' : 'warn'} />
                <SimCard label="增益裕度" value={`${result.simulation_result.gain_margin_db}dB`} suffix={` · 相位 ${result.simulation_result.phase_margin_deg}°`} tone={result.simulation_result.gain_margin_db >= 6 ? 'ok' : 'warn'} />
              </div>

              <div style={st.recBox}>
                <div style={st.recTitle}>仿真建议</div>
                <div style={st.recText}>{result.simulation_result.recommendation}</div>
              </div>

              <div style={st.detailGrid}>
                <div style={st.detailPanel}>
                  <div style={st.detailTitle}>辨识模型</div>
                  <table style={st.table}>
                    <tbody>
                      {[
                        ['增益 K', result.model.gain.toFixed(4)],
                        ['时间常数 τ', `${result.model.tau.toFixed(1)}s`],
                        ['纯滞后 θ', `${result.model.dead_time.toFixed(1)}s`],
                        ['拟合优度 R²', result.model.r_squared.toFixed(3)],
                        ['方法', result.model.method],
                      ].map(([label, val]) => (
                        <tr key={label} style={st.row}>
                          <td style={st.tdLabel}>{label}</td>
                          <td style={st.tdStrong}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={st.detailPanel}>
                  <div style={st.detailTitle}>PID 参数</div>
                  <table style={st.table}>
                    <tbody>
                      {[
                        ['Kp', result.pid_params.Kc.toFixed(4)],
                        ['Ti', `${result.pid_params.Ti.toFixed(1)}s`],
                        ['Td', `${result.pid_params.Td.toFixed(1)}s`],
                        ['方法', result.pid_params.method],
                      ].map(([label, val]) => (
                        <tr key={label} style={st.row}>
                          <td style={st.tdLabel}>{label}</td>
                          <td style={st.tdStrong}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>使用说明</div>
                <div style={st.panelSub}>仿真结果对生产决策的影响</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>仿真基于辨识模型和整定参数在虚拟环境中运行，帮助评估方案效果后再投入实际 DCS。</p>
              <p>置信度低于 40 分时不建议直接采纳，建议检查激励数据或手动调整模型参数。</p>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>场景说明</div>
                <div style={st.panelSub}>不同场景的评估侧重</div>
              </div>
            </div>
            <div style={st.textBody}>
              {scenarios.map(s => (
                <div key={s.key} style={st.scenarioDesc}>
                  <div style={{ fontWeight: 700, color: 'var(--text-strong)', marginBottom: 4 }}>{s.label}</div>
                  <div>{s.description}</div>
                </div>
              ))}
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

function SimCard({ label, value, suffix, tone }) {
  return (
    <div style={st.simCard}>
      <div style={st.simLabel}>{label}</div>
      <div style={{ ...st.simValue, ...(tone === 'ok' ? { color: 'var(--green-strong)' } : tone === 'warn' ? { color: 'var(--amber-strong)' } : { color: 'var(--text-strong)' }) }}>{value}<span style={st.simSuffix}>{suffix}</span></div>
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
  formBody: { padding: 18 },
  formRow: { display: 'flex', gap: 12, alignItems: 'center' },
  select: { flex: 1, height: 42, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 12px' },
  selectSmall: { width: 140, height: 42, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 10px' },
  primaryBtn: { height: 42, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700 },
  disabledBtn: { opacity: 0.5, cursor: 'default' },
  state: { padding: 24, color: 'var(--text-subtle)' },
  errBanner: { margin: '0 18px 18px', padding: '12px 14px', borderRadius: 12, border: '1px solid #fca5a5', background: '#fef2f2', color: 'var(--text-subtle)', fontSize: 13 },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  simCard: { background: 'var(--panel-muted)', borderRadius: 12, padding: 14, border: '1px solid var(--line)' },
  simLabel: { fontSize: 11, color: 'var(--text-subtle)', marginBottom: 8 },
  simValue: { fontSize: 22, fontWeight: 800 },
  simSuffix: { fontSize: 12, fontWeight: 400, marginLeft: 4, color: 'var(--text-subtle)' },
  recBox: { padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel-muted)', marginBottom: 16 },
  recTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 8 },
  recText: { fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.7 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  detailPanel: { border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' },
  detailTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', padding: '12px 14px', borderBottom: '1px solid var(--line)', background: 'var(--panel-muted)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  row: { borderBottom: '1px solid #edf2f7' },
  tdLabel: { padding: '10px 14px', color: 'var(--text-subtle)', fontSize: 12 },
  tdStrong: { padding: '10px 14px', color: 'var(--text-strong)', fontWeight: 600, textAlign: 'right' },
  textBody: { padding: 18, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8, display: 'grid', gap: 10 },
  scenarioDesc: { padding: '10px 0', borderBottom: '1px solid #edf2f7' },
};
