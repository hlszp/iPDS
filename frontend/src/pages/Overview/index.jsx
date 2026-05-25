import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import PlantTree from './PlantTree';
import AutoControlGauge from './AutoControlGauge';
import SortableTable from '../../components/SortableTable';
import LargeScreenToggle from '../../components/LargeScreenMode';

const GRADE_COLORS = { '优': 'var(--green)', '良': 'var(--blue)', '中': 'var(--yellow)', '差': 'var(--red)', '开环': 'var(--gray)' };

export default function Overview() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getOverview(params);
      setData(d);
    } catch (e) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleTreeSelect = ({ type, id }) => {
    const params = {};
    if (type === 'plant') params.plant_id = id;
    else if (type === 'device') params.device_id = id;
    else if (type === 'group') params.loop_group_id = id;
    setFilter(params);
    load(params);
  };

  if (loading) {
    return <div style={st.page}><p style={st.loading}>加载中...</p></div>;
  }
  if (error) {
    return <div style={st.page}><p style={st.error}>{error} <button onClick={() => load(filter)} style={st.retryBtn}>重试</button></p></div>;
  }
  if (!data) return <div style={st.page}><p style={st.loading}>暂无数据</p></div>;

  let detailRows = data.detail_table || [];
  if (gradeFilter) detailRows = detailRows.filter((r) => (r.grade_distribution || {})[gradeFilter] > 0);
  if (search) {
    const s = search.toLowerCase();
    detailRows = detailRows.filter((r) =>
      (r.loop_group_name || '').toLowerCase().includes(s) ||
      (r.device_name || '').toLowerCase().includes(s) ||
      (r.plant_name || '').toLowerCase().includes(s)
    );
  }

  const detailCols = [
    { key: 'plant_name', label: '工厂' },
    { key: 'device_name', label: '装置' },
    { key: 'loop_group_name', label: '回路组' },
    { key: 'total_loops', label: '回路数', align: 'right' },
    { key: 'avg_performance_score', label: '性能评分', align: 'right' },
    { key: 'auto_control_rate', label: '自控率(%)', align: 'right' },
    { key: 'stability_rate', label: '平稳率(%)', align: 'right' },
  ];

  return (
    <div style={st.page}>
      {/* Top row: tree + gauge */}
      <div style={st.topRow}>
        <div style={st.treePanel}>
          <div style={st.panelTitle}>装置导航</div>
          <PlantTree onSelect={handleTreeSelect} />
        </div>
        <div style={st.gaugePanel}>
          <div style={st.panelTitle}>实时自控率</div>
          <AutoControlGauge
            value={data.auto_control_rate}
            autoLoops={data.auto_loops}
            manualLoops={data.manual_loops}
          />
        </div>
        <div style={st.kpiPanel}>
          <div style={st.panelTitle}>上一整点性能指标</div>
          <div style={st.kpiRow}>
            <KpiCard label="性能评分" value={data.prev_hour_kpi?.performance_score} unit="分" color="var(--accent)" />
            <KpiCard label="自控率" value={data.prev_hour_kpi?.auto_control_rate} unit="%" color="var(--green)" />
            <KpiCard label="平稳率" value={data.prev_hour_kpi?.stability_rate} unit="%" color="var(--blue)" />
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={st.detailPanel}>
        <div style={st.detailHeader}>
          <span style={st.panelTitle}>装置/回路组详情</span>
          <div style={st.filterRow}>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
              style={st.filterSelect}>
              <option value="">全部等级</option>
              {(data.grade_filter_options || []).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={st.filterInput} />
          </div>
        </div>
        <SortableTable columns={detailCols} rows={detailRows} defaultSort={{ key: 'avg_performance_score', dir: 'desc' }}
          emptyText="暂无回路组数据" />
      </div>

      {/* Bottom bar */}
      <div style={st.bottomBar}>
        <span>数据更新时间: {new Date().toLocaleTimeString()}</span>
        <LargeScreenToggle />
        <span style={{ opacity: 0.5 }}>评估引擎状态: 运行中</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, color }) {
  return (
    <div style={{ ...st.kpiCard, borderTop: `3px solid ${color}` }}>
      <div style={st.kpiLabel}>{label}</div>
      <div style={{ ...st.kpiValue, color }}>{value ?? '—'}<span style={st.kpiUnit}>{unit}</span></div>
    </div>
  );
}

const st = {
  page: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', color: 'var(--text)' },
  topRow: { display: 'flex', gap: 16, minHeight: 220 },
  treePanel: { flex: '0 0 220px', background: 'var(--surface)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', overflow: 'auto' },
  gaugePanel: { flex: '0 0 auto', background: 'var(--surface)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' },
  kpiPanel: { flex: 1, background: 'var(--surface)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' },
  panelTitle: { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 },
  kpiRow: { display: 'flex', gap: 16, justifyContent: 'space-around' },
  kpiCard: { flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '16px 20px', textAlign: 'center' },
  kpiLabel: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 },
  kpiValue: { fontSize: 32, fontWeight: 700 },
  kpiUnit: { fontSize: 14, fontWeight: 400, marginLeft: 4 },
  detailPanel: { flex: 1, background: 'var(--surface)', borderRadius: 8, padding: 16, border: '1px solid var(--border)', overflow: 'auto' },
  detailHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterRow: { display: 'flex', gap: 8 },
  filterSelect: { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12 },
  filterInput: { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: 160 },
  bottomBar: { display: 'flex', fontSize: 11, color: 'var(--text-dim)', paddingTop: 4 },
  loading: { textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 },
  error: { textAlign: 'center', color: 'var(--red)', marginTop: 40 },
  retryBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', marginLeft: 8 },
};
