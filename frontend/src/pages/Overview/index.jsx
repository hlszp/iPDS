import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import LargeScreenToggle from '../../components/LargeScreenMode';
import PlantTree from './PlantTree';

const GRADE_ORDER = ['优', '良', '中', '差', '开环'];
const GRADE_TONE = {
  优: { bg: '#dcfce7', color: '#166534' },
  良: { bg: '#dbeafe', color: '#1d4ed8' },
  中: { bg: '#fef3c7', color: '#92400e' },
  差: { bg: '#fee2e2', color: '#991b1b' },
  开环: { bg: '#e5e7eb', color: '#475569' },
};

export default function Overview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState({});
  const unitFilter = searchParams.get('unit') || '';

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const next = await api.getOverview(params);
      setData(next);
    } catch (e) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(scopeFilter); }, [load, scopeFilter]);

  const unitOptions = useMemo(() => {
    const seen = new Set();
    return (data?.detail_table || []).reduce((list, row) => {
      const unit = row.device_name || '';
      if (!unit || seen.has(unit)) return list;
      seen.add(unit);
      list.push(unit);
      return list;
    }, []);
  }, [data]);

  useEffect(() => {
    if (!unitFilter || unitOptions.includes(unitFilter)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('unit');
    setSearchParams(nextParams);
  }, [unitFilter, unitOptions, searchParams, setSearchParams]);

  const handleTreeSelect = ({ type, id }) => {
    const next = {};
    if (type === 'plant') next.plant_id = id;
    if (type === 'device') next.device_id = id;
    if (type === 'group') next.loop_group_id = id;
    setScopeFilter(next);
  };

  const handleUnitChange = (unit) => {
    const nextParams = new URLSearchParams(searchParams);
    if (unit) nextParams.set('unit', unit);
    else nextParams.delete('unit');
    setSearchParams(nextParams);
  };

  if (loading) return <div style={st.state}>加载中...</div>;
  if (error) return <div style={st.state}>{error} <button onClick={() => load(scopeFilter)} style={st.retry}>重试</button></div>;
  if (!data) return <div style={st.state}>暂无数据</div>;

  let detailRows = data.detail_table || [];
  if (unitFilter) detailRows = detailRows.filter((row) => row.device_name === unitFilter);
  if (gradeFilter) detailRows = detailRows.filter((row) => (row.grade_distribution || {})[gradeFilter] > 0);
  if (search) {
    const query = search.toLowerCase();
    detailRows = detailRows.filter((row) =>
      (row.loop_group_name || '').toLowerCase().includes(query) ||
      (row.device_name || '').toLowerCase().includes(query) ||
      (row.plant_name || '').toLowerCase().includes(query)
    );
  }

  const detailCols = [
    { key: 'plant_name', label: '工厂' },
    { key: 'device_name', label: '装置' },
    { key: 'loop_group_name', label: '回路组' },
    { key: 'total_loops', label: '回路数', align: 'right' },
    { key: 'avg_performance_score', label: '平均评分', align: 'right' },
    { key: 'auto_control_rate', label: '自控率(%)', align: 'right' },
    { key: 'stability_rate', label: '平稳率(%)', align: 'right' },
  ];

  const gradeCards = GRADE_ORDER.map((grade) => {
    const count = detailRows.reduce((sum, row) => sum + ((row.grade_distribution || {})[grade] || 0), 0);
    return { grade, count, tone: GRADE_TONE[grade] };
  });

  const trust = data.runtime_provider || {};
  const worstLoops = [...(data.bottom_loops || [])].sort((a, b) => a.performance_score - b.performance_score);

  return (
    <div style={st.page}>
      <section style={st.heroGrid}>
        <div style={st.heroCard}>
          <div style={st.cardLabel}>运行数据状态</div>
          <div style={st.heroValue}>{trust.degraded ? '已降级' : '正常'}</div>
          <div style={st.cardText}>配置模式：{trust.configured_source || '—'} / 生效模式：{trust.effective_source || '—'}</div>
          <div style={st.cardText}>回路覆盖：{trust.served_loop_count ?? 0}/{trust.expected_loop_count ?? 0}</div>
        </div>
        <div style={st.heroCard}>
          <div style={st.cardLabel}>在线回路</div>
          <div style={st.heroValue}>{data.auto_loops} / {data.total_loops}</div>
          <div style={st.cardText}>自动回路 / 总回路</div>
        </div>
        <div style={st.heroCard}>
          <div style={st.cardLabel}>上一整点评分</div>
          <div style={st.heroValue}>{data.prev_hour_kpi?.performance_score ?? '—'}</div>
          <div style={st.cardText}>自控率 {data.prev_hour_kpi?.auto_control_rate ?? '—'}% · 平稳率 {data.prev_hour_kpi?.stability_rate ?? '—'}%</div>
        </div>
        <div style={st.heroCardWide}>
          <div style={st.cardLabel}>状态说明</div>
          <div style={st.cardTitle}>正式产品视图仅展示真实数据链路结果</div>
          <div style={st.cardText}>{trust.fallback_reason || trust.detail || '当前未获取到运行数据说明。'}</div>
          <div style={st.heroActions}><LargeScreenToggle /></div>
        </div>
      </section>

      <section style={st.bodyGrid}>
        <div style={st.panel}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>装置导航</div>
              <div style={st.panelSub}>按工厂 / 装置 / 回路组筛选全局视图</div>
            </div>
          </div>
          <div style={st.panelBody}><PlantTree onSelect={handleTreeSelect} /></div>
        </div>

        <div style={st.panelWide}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>等级分布概览</div>
              <div style={st.panelSub}>按当前筛选范围统计各等级回路数量</div>
            </div>
          </div>
          <div style={st.gradeGrid}>
            {gradeCards.map((item) => (
              <button key={item.grade} onClick={() => setGradeFilter((prev) => prev === item.grade ? '' : item.grade)} style={{ ...st.gradeCard, background: item.tone.bg, color: item.tone.color, borderColor: gradeFilter === item.grade ? item.tone.color : 'transparent' }}>
                <div style={st.gradeName}>{item.grade}</div>
                <div style={st.gradeCount}>{item.count}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={st.bottomGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeaderRow}>
            <div>
              <div style={st.panelTitle}>装置 / 回路组详情</div>
              <div style={st.panelSub}>聚合查看评分、自控率、平稳率与等级分布</div>
            </div>
            <div style={st.filters}>
              <select value={unitFilter} onChange={(e) => handleUnitChange(e.target.value)} style={st.select}>
                <option value="">全部装置</option>
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索工厂 / 装置 / 回路组" style={st.input} />
            </div>
          </div>
          <SortableTable columns={detailCols} rows={detailRows} defaultSort={{ key: 'avg_performance_score', dir: 'desc' }} emptyText="暂无回路组数据" />
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>重点改善回路</div>
                <div style={st.panelSub}>优先关注低分回路并进入详情</div>
              </div>
            </div>
            <div style={st.listBody}>
              {worstLoops.map((loop) => (
                <button key={loop.tag_name} onClick={() => navigate(`/assessment/${loop.tag_name}`)} style={st.loopItem}>
                  <div>
                    <div style={st.loopName}>{loop.tag_name}</div>
                    <div style={st.loopMeta}>{loop.unit || '未分配装置'}</div>
                  </div>
                  <div style={st.loopScore}>{loop.performance_score}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>最佳表现回路</div>
                <div style={st.panelSub}>用于对标当前运行标杆</div>
              </div>
            </div>
            <div style={st.listBody}>
              {(data.top_loops || []).map((loop) => (
                <div key={loop.tag_name} style={st.loopStaticItem}>
                  <div>
                    <div style={st.loopName}>{loop.tag_name}</div>
                    <div style={st.loopMeta}>{loop.unit || '未分配装置'}</div>
                  </div>
                  <div style={st.goodScore}>{loop.performance_score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  state: { color: 'var(--text-subtle)', padding: 24 },
  retry: { marginLeft: 8, border: '1px solid var(--line)', background: '#fff', borderRadius: 8, padding: '4px 10px', color: 'var(--text-muted)' },
  heroGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  heroCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  heroCardWide: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  cardLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  heroValue: { fontSize: 30, fontWeight: 800, color: 'var(--text-strong)' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 8 },
  cardText: { marginTop: 8, fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.7 },
  heroActions: { marginTop: 14, display: 'flex', justifyContent: 'flex-end' },
  bodyGrid: { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 16 },
  bottomGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) 360px', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelWide: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelHeaderRow: { padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  panelBody: { padding: 18 },
  gradeGrid: { padding: 18, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 },
  gradeCard: { border: '2px solid transparent', borderRadius: 14, padding: 16, textAlign: 'left' },
  gradeName: { fontSize: 13, fontWeight: 700, marginBottom: 12 },
  gradeCount: { fontSize: 28, fontWeight: 800 },
  filters: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  select: { minWidth: 140, height: 38, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 10px' },
  input: { width: 220, height: 38, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-strong)', padding: '0 12px' },
  listBody: { padding: 18, display: 'grid', gap: 10 },
  loopItem: { border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' },
  loopStaticItem: { border: '1px solid var(--line)', background: 'var(--panel-muted)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  loopName: { fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' },
  loopMeta: { marginTop: 4, fontSize: 12, color: 'var(--text-subtle)' },
  loopScore: { fontSize: 24, fontWeight: 800, color: 'var(--red)' },
  goodScore: { fontSize: 24, fontWeight: 800, color: 'var(--green-strong)' },
};
