import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';

const REALTIME_COLS = [
  { key: 'tag_name', label: '回路名称' },
  { key: 'unit', label: '所属装置' },
  { key: 'self_control_rate', label: '自控率(%)', align: 'right' },
  { key: 'stability_rate', label: '平稳率(%)', align: 'right' },
  { key: 'performance_score', label: '性能评分', align: 'right' },
  { key: 'grade', label: '性能等级' },
];

export default function Monitoring() {
  const nav = useNavigate();
  const [tab, setTab] = useState('realtime');

  return (
    <div style={st.page}>
      <div style={st.tabs}>
        <button onClick={() => setTab('realtime')} style={{ ...st.tab, borderBottomColor: tab === 'realtime' ? 'var(--accent)' : 'transparent', color: tab === 'realtime' ? '#fff' : 'var(--text-dim)' }}>实时监控</button>
        <button onClick={() => setTab('history')} style={{ ...st.tab, borderBottomColor: tab === 'history' ? 'var(--accent)' : 'transparent', color: tab === 'history' ? '#fff' : 'var(--text-dim)' }}>历史查询</button>
      </div>
      {tab === 'realtime' ? <RealtimePanel nav={nav} /> : <HistoryPanel />}
    </div>
  );
}

function RealtimePanel({ nav }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('performance_score');
  const [sortDir, setSortDir] = useState('desc');

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMonitoringRealtime({ ...params, sort_by: sortBy, sort_dir: sortDir });
      setRows(data.rows || []);
    } catch (e) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={st.status}>加载中...</p>;
  if (error) return <p style={st.err}>{error} <button onClick={() => load()} style={st.retryBtn}>重试</button></p>;

  return (
    <SortableTable columns={REALTIME_COLS} rows={rows}
      defaultSort={{ key: 'performance_score', dir: 'desc' }}
      emptyText="暂无回路数据"
      onRowClick={(row) => nav(`/assessment/${row.tag_name}`)}
    />
  );
}

function HistoryPanel() {
  const [dim, setDim] = useState('hour');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMonitoringHistory({ dimension: dim })
      .then((d) => setPoints(d.points || []))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, [dim]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>统计维度:</span>
        {['hour', 'day', 'month'].map((d) => (
          <button key={d} onClick={() => setDim(d)}
            style={{ ...st.dimBtn, background: dim === d ? 'var(--accent)' : 'var(--bg)', color: dim === d ? '#000' : 'var(--text)' }}>
            {{ hour: '时', day: '日', month: '月' }[d]}
          </button>
        ))}
      </div>
      {loading ? <p style={st.status}>加载中...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={st2.th}>时间</th>
              <th style={{ ...st2.th, textAlign: 'right' }}>平均性能评分</th>
              <th style={{ ...st2.th, textAlign: 'right' }}>平均自控率(%)</th>
              <th style={{ ...st2.th, textAlign: 'right' }}>平均平稳率(%)</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={st2.td}>{p.label}</td>
                <td style={{ ...st2.td, textAlign: 'right' }}>{p.avg_performance_score}</td>
                <td style={{ ...st2.td, textAlign: 'right' }}>{p.avg_auto_control_rate}</td>
                <td style={{ ...st2.td, textAlign: 'right' }}>{p.avg_stability_rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const st = {
  page: { padding: 24, height: '100%', overflow: 'auto', color: 'var(--text)' },
  tabs: { display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text)', padding: '8px 20px', fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  dimBtn: { border: '1px solid var(--border)', borderRadius: 4, padding: '4px 14px', fontSize: 12, cursor: 'pointer' },
  status: { textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 },
  err: { textAlign: 'center', color: 'var(--red)', marginTop: 40 },
  retryBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', marginLeft: 8 },
};

const st2 = {
  th: { padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-dim)', fontWeight: 600, fontSize: 12 },
  td: { padding: '8px 12px', color: 'var(--text)' },
};
