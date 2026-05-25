import { useEffect, useState, useCallback } from 'react';
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
  { key: 'op_travel_index', label: 'OP行程指数', align: 'right' },
  { key: 'good_value_rate', label: '优良值率(%)', align: 'right' },
  { key: 'commissioning_rate', label: '投运率(%)', align: 'right' },
  { key: 'grade', label: '性能等级' },
];

export default function Assessment() {
  const nav = useNavigate();
  const [tab, setTab] = useState('realtime');

  return (
    <div style={st.page}>
      <div style={st.tabs}>
        <button onClick={() => setTab('realtime')}
          style={{ ...st.tab, borderBottomColor: tab === 'realtime' ? 'var(--accent)' : 'transparent', color: tab === 'realtime' ? '#fff' : 'var(--text-dim)' }}>
          实时监控
        </button>
        <button onClick={() => setTab('history')}
          style={{ ...st.tab, borderBottomColor: tab === 'history' ? 'var(--accent)' : 'transparent', color: tab === 'history' ? '#fff' : 'var(--text-dim)' }}>
          历史查询
        </button>
      </div>
      {tab === 'realtime' ? <RealtimePanel nav={nav} /> : <HistoryPanel />}
    </div>
  );
}

function RealtimePanel({ nav }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minOsc, setMinOsc] = useState('');
  const [minStiction, setMinStiction] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = {};
    if (minOsc) params.min_oscillation_rate = Number(minOsc);
    if (minStiction) params.min_stiction = Number(minStiction);
    if (gradeFilter) params.grade = gradeFilter;
    try {
      const data = await api.getAssessmentRealtime(params);
      setRows(data.rows || []);
    } catch (e) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [minOsc, minStiction, gradeFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={st.filters}>
        <label style={st.flabel}>振荡率≥</label>
        <input type="number" placeholder="0" value={minOsc} onChange={(e) => setMinOsc(e.target.value)}
          style={st.finput} />
        <label style={st.flabel}>粘滞系数≥</label>
        <input type="number" step="0.01" placeholder="0" value={minStiction} onChange={(e) => setMinStiction(e.target.value)}
          style={st.finput} />
        <label style={st.flabel}>性能等级</label>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} style={st.fselect}>
          <option value="">全部</option>
          {['优', '良', '中', '差', '开环'].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={load} style={st.filterBtn}>筛选</button>
      </div>
      {loading ? <p style={st.status}>加载中...</p> :
       error ? <p style={st.err}>{error} <button onClick={load} style={st.retryBtn}>重试</button></p> :
       <SortableTable columns={ASSESS_COLS} rows={rows}
         defaultSort={{ key: 'performance_score', dir: 'desc' }}
         emptyText="暂无符合筛选条件的回路"
         onRowClick={(row) => nav(`/assessment/${row.tag_name}`)}
       />}
    </div>
  );
}

function HistoryPanel() {
  return <p style={st.status}>历史查询 — 选择时间范围查看历史评估数据</p>;
}

const st = {
  page: { padding: 24, height: '100%', overflow: 'auto', color: 'var(--text)' },
  tabs: { display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', padding: '8px 20px', fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  filters: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  flabel: { fontSize: 12, color: 'var(--text-dim)' },
  finput: { width: 70, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12 },
  fselect: { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12 },
  filterBtn: { background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  status: { textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 },
  err: { textAlign: 'center', color: 'var(--red)', marginTop: 40 },
  retryBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', marginLeft: 8 },
};
