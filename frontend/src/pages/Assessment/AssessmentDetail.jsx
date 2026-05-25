import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import RadarChart from './RadarChart';

const GRADE_COLORS = { '优': 'var(--green)', '良': 'var(--blue)', '中': 'var(--yellow)', '差': 'var(--red)', '开环': 'var(--gray)' };

export default function AssessmentDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [radar, setRadar] = useState(null);
  const [sugg, setSugg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tagName) return;
    setLoading(true);
    Promise.all([
      api.getLoopDetail(tagName),
      api.getRadar(tagName),
      api.getSuggestions(tagName),
    ]).then(([detail, radarData, sugData]) => {
      setData(detail);
      setRadar(radarData);
      setSugg(sugData);
    }).catch(() => {
      setData(null);
      setRadar(null);
      setSugg(null);
    }).finally(() => setLoading(false));
  }, [tagName]);

  if (loading) return <div style={st.page}><p style={st.status}>加载中...</p></div>;
  if (!data) return <div style={st.page}><p style={st.err}>加载失败</p></div>;

  const a = data.assessment;
  const d = data.diagnosis;

  return (
    <div style={st.page}>
      <div style={st.topBar}>
        <button onClick={() => nav('/assessment')} style={st.backBtn}>← 返回评估列表</button>
        <h1 style={st.title}>{tagName}</h1>
        <span style={{ ...st.grade, color: GRADE_COLORS[a.grade] || 'var(--text-dim)' }}>{a.grade}</span>
        <button onClick={() => nav(`/loop/${tagName}/tuning`)} style={st.tuneBtn}>PID整定 →</button>
      </div>

      {/* PV/SP/OP Real-time values */}
      <div style={st.realtimeRow}>
        <RealtimeCard label="PV (过程值)" value={data.trend?.pv?.[data.trend.pv.length - 1]?.toFixed(2)} unit="" color="var(--green)" />
        <RealtimeCard label="SP (设定值)" value={data.trend?.sp?.[data.trend.sp.length - 1]?.toFixed(2)} unit="" color="var(--blue)" />
        <RealtimeCard label="OP (输出值)" value={data.trend?.op?.[data.trend.op.length - 1]?.toFixed(2)} unit="%" color="var(--accent)" />
      </div>

      {/* Radar chart + Performance indicators */}
      <div style={st.mainGrid}>
        <div style={st.panel}>
          <div style={st.panelTitle}>多维度综合分析（雷达图）</div>
          {radar ? <RadarChart tagName={tagName} dimensions={radar.dimensions} /> : <p style={st.status}>加载中...</p>}
        </div>
        <div style={st.panel}>
          <div style={st.panelTitle}>性能指标</div>
          <table style={st.indTable}>
            <tbody>
              {[
                ['性能评分', a.performance_score, '分'],
                ['性能等级', a.grade, ''],
                ['自控率', a.self_control_rate, '%'],
                ['平稳率', a.stability_rate, '%'],
                ['准确率', a.accuracy_rate, '%'],
                ['快速率', a.fast_rate, '%'],
                ['有效自控率', a.effective_auto_rate, '%'],
              ].map(([label, val, unit]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={st.tdLabel}>{label}</td>
                  <td style={{ ...st.tdVal, color: label === '性能等级' ? GRADE_COLORS[val] : 'var(--text)' }}>
                    {typeof val === 'number' ? val.toFixed(1) : val}{unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fault diagnosis indicators */}
      <div style={st.panel}>
        <div style={st.panelTitle}>故障诊断指标</div>
        <div style={st.diagGrid}>
          {[
            ['振荡率', a.oscillation_index != null ? (a.oscillation_index * 100).toFixed(1) + '%' : '—'],
            ['粘滞系数', d?.stiction_confidence?.toFixed(3) || '—'],
            ['饱和率', a.valve_saturation_rate != null ? (a.valve_saturation_rate * 100).toFixed(1) + '%' : '—'],
            ['调节时间', d?.settling_time != null ? d.settling_time.toFixed(1) + 's' : '—'],
            ['OP行程指数', d?.travel_index?.toFixed(3) || '—'],
            ['优良值率', d?.good_rate?.toFixed(1) + '%' || '—'],
            ['投运率', a.effective_auto_rate?.toFixed(1) + '%' || '—'],
            ['操作频次', a.operation_frequency?.toFixed(2) + '次/h' || '—'],
          ].map(([label, val]) => (
            <div key={label} style={st.diagCard}>
              <div style={st.diagLabel}>{label}</div>
              <div style={st.diagVal}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligent diagnosis & suggestions */}
      {sugg && (
        <div style={st.panel}>
          <div style={st.panelTitle}>智能诊断与优化建议</div>
          <div style={st.suggBox}>
            <div style={st.suggTitle}>
              诊断结果：{sugg.suggestion?.title || '运行正常'}
              <span style={{ fontSize: 12, marginLeft: 12, opacity: 0.6 }}>
                置信度 {(sugg.fault_confidence * 100).toFixed(0)}%
              </span>
            </div>
            {sugg.suggestion?.diagnosis && (
              <p style={st.suggDiag}>{sugg.suggestion.diagnosis}</p>
            )}
            {sugg.suggestion?.causes?.length > 0 && (
              <div style={st.suggSection}>
                <div style={st.suggSectionTitle}>可能原因</div>
                <ul style={st.suggList}>
                  {sugg.suggestion.causes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {sugg.suggestion?.suggestions?.length > 0 && (
              <div style={st.suggSection}>
                <div style={st.suggSectionTitle}>优化建议</div>
                <ul style={st.suggList}>
                  {sugg.suggestion.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fault details */}
      <div style={st.panel}>
        <div style={st.panelTitle}>故障检测详情</div>
        <div style={st.faultGrid}>
          <FaultChip label="阀门粘滞" detected={d?.stiction_detected} conf={d?.stiction_confidence} />
          <FaultChip label="回路振荡" detected={d?.oscillation_detected} conf={d?.oscillation_confidence} period={d?.oscillation_period} />
          <FaultChip label="非线性" detected={d?.nonlinearity_detected} conf={d?.nonlinearity_degree} />
          <FaultChip label="回路耦合" detected={d?.coupling_candidates?.length > 0} conf={d?.coupling_strength} tags={d?.coupling_candidates} />
        </div>
      </div>
    </div>
  );
}

function RealtimeCard({ label, value, unit, color }) {
  return (
    <div style={{ ...st.rtCard, borderTop: `3px solid ${color}` }}>
      <div style={st.rtLabel}>{label}</div>
      <div style={{ ...st.rtValue, color }}>{value ?? '—'}{unit}</div>
    </div>
  );
}

function FaultChip({ label, detected, conf, period, tags }) {
  const color = detected ? 'var(--red)' : 'var(--green)';
  const status = detected ? '检测到' : '未检测到';
  let detail = '';
  if (period) detail = `周期 ${period.toFixed(1)}s`;
  if (tags?.length) detail = `关联: ${tags.slice(0, 3).join(', ')}`;
  return (
    <div style={{ ...st.faultChip, borderColor: color }}>
      <div style={{ fontWeight: 600, color }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{status}{conf != null ? ` (${(conf * 100).toFixed(0)}%)` : ''}</div>
      {detail && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{detail}</div>}
    </div>
  );
}

const st = {
  page: { padding: 24, height: '100%', overflow: 'auto', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 16 },
  topBar: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  title: { fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 },
  grade: { fontSize: 18, fontWeight: 700 },
  tuneBtn: { marginLeft: 'auto', background: 'var(--accent)', color: '#000', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  realtimeRow: { display: 'flex', gap: 16 },
  rtCard: { flex: 1, background: 'var(--surface)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' },
  rtLabel: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 },
  rtValue: { fontSize: 28, fontWeight: 700 },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  panel: { background: 'var(--surface)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' },
  panelTitle: { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 },
  indTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  tdLabel: { padding: '6px 8px', color: 'var(--text-dim)', fontSize: 12 },
  tdVal: { padding: '6px 8px', textAlign: 'right', fontWeight: 600 },
  diagGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  diagCard: { background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 14px', textAlign: 'center' },
  diagLabel: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 },
  diagVal: { fontSize: 16, fontWeight: 700, color: 'var(--accent)' },
  suggBox: { background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: 16 },
  suggTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 },
  suggDiag: { color: 'var(--text)', fontSize: 13, marginBottom: 12 },
  suggSection: { marginTop: 12 },
  suggSectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 },
  suggList: { margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: 13, lineHeight: 1.8 },
  faultGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  faultChip: { border: '1px solid', borderRadius: 8, padding: '10px 14px' },
  status: { textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 },
  err: { textAlign: 'center', color: 'var(--red)', marginTop: 40 },
};
