import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';

const ASSESS_COLS = [
  { key: 'tag_name', label: '回路名称' },
  { key: 'unit', label: '所属装置' },
  { key: 'oscillation_rate', label: '振荡率(%)', align: 'right' },
  { key: 'stiction_coefficient', label: '粘滞系数', align: 'right' },
  { key: 'saturation_rate', label: '饱和率(%)', align: 'right' },
  { key: 'settling_time', label: '调节时间(s)', align: 'right', render: (v) => v != null ? v.toFixed(1) : '—' },
  { key: 'good_value_rate', label: '优良值率(%)', align: 'right' },
  { key: 'commissioning_rate', label: '投运率(%)', align: 'right' },
  { key: 'performance_score', label: '性能评分', align: 'right' },
  { key: 'grade', label: '性能等级' },
];

const GRADE_TONES = {
  优: { bg: '#dcfce7', color: '#166534' },
  良: { bg: '#dbeafe', color: '#1d4ed8' },
  中: { bg: '#fef3c7', color: '#92400e' },
  差: { bg: '#fee2e2', color: '#991b1b' },
  开环: { bg: '#e5e7eb', color: '#475569' },
};

export default function Assessment() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minOsc, setMinOsc] = useState('');
  const [minStiction, setMinStiction] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (minOsc) params.min_oscillation_rate = Number(minOsc);
    if (minStiction) params.min_stiction = Number(minStiction);
    if (gradeFilter) params.grade = gradeFilter;
    api.getAssessmentRealtime(params)
      .then((data) => {
        setRows(data.rows || []);
        setRuntime(data.runtime_provider || null);
      })
      .catch((e) => setError(e.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [minOsc, minStiction, gradeFilter]);

  const summary = useMemo(() => {
    if (!rows.length) return { total: 0, avgScore: '—', avgOsc: '—', avgStiction: '—' };
    const total = rows.length;
    const avgScore = (rows.reduce((sum, row) => sum + (row.performance_score || 0), 0) / total).toFixed(1);
    const avgOsc = (rows.reduce((sum, row) => sum + (row.oscillation_rate || 0), 0) / total).toFixed(1);
    const avgStiction = (rows.reduce((sum, row) => sum + (row.stiction_coefficient || 0), 0) / total).toFixed(3);
    return { total, avgScore, avgOsc, avgStiction };
  }, [rows]);

  const gradeCards = useMemo(() => {
    return Object.keys(GRADE_TONES).map((grade) => ({
      grade,
      count: rows.filter((row) => row.grade === grade).length,
      tone: GRADE_TONES[grade],
    }));
  }, [rows]);

  const focusLoops = [...rows].sort((a, b) => a.performance_score - b.performance_score).slice(0, 5);

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="评估回路" value={summary.total} detail="当前筛选范围" />
        <MetricCard label="平均评分" value={summary.avgScore} detail="实时评估均值" />
        <MetricCard label="平均振荡率" value={`${summary.avgOsc}${summary.avgOsc === '—' ? '' : '%'}`} detail="问题稳定性指标" />
        <MetricCard label="平均粘滞系数" value={summary.avgStiction} detail="阀门粘滞风险" />
      </section>

      <div style={st.banner(runtime?.degraded ? 'warn' : 'ok')}>
        <div>配置模式：<strong>{runtime?.configured_source || '—'}</strong></div>
        <div>当前生效：<strong>{runtime?.effective_source || '—'}</strong></div>
        <div>回路覆盖：<strong>{runtime?.served_loop_count ?? 0}/{runtime?.expected_loop_count ?? 0}</strong></div>
        <div style={st.bannerDetail}>状态说明：{runtime?.fallback_reason || runtime?.detail || '尚未获取运行数据状态。'}</div>
      </div>

      <section style={st.gradeGrid}>
        {gradeCards.map((item) => (
          <button key={item.grade} onClick={() => setGradeFilter((prev) => prev === item.grade ? '' : item.grade)} style={{ ...st.gradeCard, background: item.tone.bg, color: item.tone.color, borderColor: gradeFilter === item.grade ? item.tone.color : 'transparent' }}>
            <div style={st.gradeName}>{item.grade}</div>
            <div style={st.gradeCount}>{item.count}</div>
          </button>
        ))}
      </section>

      <section style={st.contentGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeaderRow}>
            <div>
              <div style={st.panelTitle}>问题回路评估矩阵</div>
              <div style={st.panelSub}>以振荡、粘滞、饱和和投运指标定位需要优先处理的回路。</div>
            </div>
            <div style={st.filters}>
              <input type="number" placeholder="振荡率≥" value={minOsc} onChange={(e) => setMinOsc(e.target.value)} style={st.inputSmall} />
              <input type="number" step="0.01" placeholder="粘滞系数≥" value={minStiction} onChange={(e) => setMinStiction(e.target.value)} style={st.inputSmall} />
              <button onClick={() => { setMinOsc(''); setMinStiction(''); setGradeFilter(''); }} style={st.resetBtn}>清空筛选</button>
            </div>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            {loading ? <div style={st.state}>加载中...</div> : error ? <div style={st.state}>{error}</div> : (
              <SortableTable columns={ASSESS_COLS} rows={rows} defaultSort={{ key: 'performance_score', dir: 'asc' }} emptyText="暂无符合筛选条件的回路" onRowClick={(row) => nav(`/assessment/${row.tag_name}`)} />
            )}
          </div>
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>优先改善回路</div>
                <div style={st.panelSub}>点击进入单回路评估详情与整定入口</div>
              </div>
            </div>
            <div style={st.listBody}>
              {focusLoops.map((loop) => (
                <button key={loop.tag_name} onClick={() => nav(`/assessment/${loop.tag_name}`)} style={st.loopItem}>
                  <div>
                    <div style={st.loopName}>{loop.tag_name}</div>
                    <div style={st.loopMeta}>{loop.unit || '未分配装置'} · {loop.grade}</div>
                  </div>
                  <div style={st.loopScore}>{loop.performance_score.toFixed(1)}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>评估使用说明</div>
                <div style={st.panelSub}>当前页只展示真实评估结果，不生成额外模拟结论</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>本页用于筛选问题回路并进入单回路诊断详情。</p>
              <p>如果运行数据源降级，筛选结果仍会明确标注来源状态，不会伪装为真实实时数据。</p>
            </div>
          </div>
        </div>
      </section>
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
  banner: (tone) => ({ padding: '12px 14px', borderRadius: 14, border: `1px solid ${tone === 'warn' ? '#fcd34d' : '#86efac'}`, background: tone === 'warn' ? '#fffbeb' : '#f0fdf4', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, auto)) 1fr', gap: 12, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }),
  bannerDetail: { minWidth: 0 },
  gradeGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 },
  gradeCard: { border: '2px solid transparent', borderRadius: 14, padding: 16, textAlign: 'left' },
  gradeName: { fontSize: 13, fontWeight: 700, marginBottom: 12 },
  gradeCount: { fontSize: 28, fontWeight: 800 },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 340px', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelHeaderRow: { padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  filters: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  inputSmall: { width: 110, height: 38, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 10px' },
  resetBtn: { height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)' },
  state: { padding: 24, color: 'var(--text-subtle)' },
  listBody: { padding: 18, display: 'grid', gap: 10 },
  textBody: { padding: 18, display: 'grid', gap: 10, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8 },
  loopItem: { border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' },
  loopName: { fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' },
  loopMeta: { marginTop: 4, fontSize: 12, color: 'var(--text-subtle)' },
  loopScore: { fontSize: 24, fontWeight: 800, color: 'var(--red)' },
};
