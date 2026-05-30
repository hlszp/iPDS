import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import LargeScreenToggle from '../../components/LargeScreenMode';
import PlantTree from './PlantTree';
import {
  FilterBar,
  FilterGroup,
  GradePill,
  LoopListItem,
  MetricCard,
  PageSection,
  Panel,
  StateBlock,
  StatusBanner,
} from '../../components/ui';

const GRADE_ORDER = ['优', '良', '中', '差', '开环'];

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

  useEffect(() => {
    load(scopeFilter);
  }, [load, scopeFilter]);

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

  if (loading) return <StateBlock type="loading" title="总览数据加载中" detail="正在汇总当前筛选范围的回路健康、评分与重点问题。" />;
  if (error) return <StateBlock type="error" title="总览数据加载失败" detail={error} action={<button type="button" className="ui-secondary-action" onClick={() => load(scopeFilter)}>重试</button>} />;
  if (!data) return <StateBlock type="empty" title="暂无总览数据" detail="当前范围没有可展示的回路统计，请检查数据源或调整筛选范围。" />;

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

  const gradeCards = GRADE_ORDER.map((grade) => ({
    grade,
    count: detailRows.reduce((sum, row) => sum + ((row.grade_distribution || {})[grade] || 0), 0),
  }));

  const trust = data.runtime_provider || {};
  const worstLoops = [...(data.bottom_loops || [])].sort((a, b) => a.performance_score - b.performance_score);
  const topLoops = data.top_loops || [];

  return (
    <div className="ui-stack">
      <section className="ui-summary-grid">
        <MetricCard label="运行状态" value={trust.degraded ? '已降级' : '正常'} detail={`配置 ${trust.configured_source || '—'} / 生效 ${trust.effective_source || '—'}`} tone={trust.degraded ? 'warn' : 'default'} />
        <MetricCard label="在线回路" value={`${data.auto_loops} / ${data.total_loops}`} detail="自动回路 / 总回路" />
        <MetricCard label="上一整点评分" value={data.prev_hour_kpi?.performance_score ?? '—'} detail={`自控率 ${data.prev_hour_kpi?.auto_control_rate ?? '—'}% · 平稳率 ${data.prev_hour_kpi?.stability_rate ?? '—'}%`} />
        <MetricCard label="下一步" value={worstLoops[0]?.tag_name || '—'} detail="优先进入低分回路详情，确认原因并推进整定。" />
      </section>

      <StatusBanner
        tone={trust.degraded ? 'warn' : 'ok'}
        items={[
          { label: '配置模式', value: trust.configured_source || '—' },
          { label: '当前生效', value: trust.effective_source || '—' },
          { label: '回路覆盖', value: `${trust.served_loop_count ?? 0}/${trust.expected_loop_count ?? 0}` },
        ]}
        detail={trust.fallback_reason || trust.detail || '当前未获取到运行数据说明。'}
        actions={<LargeScreenToggle />}
      />

      <PageSection columns="tight">
        <Panel title="装置导航" subtitle="按工厂 / 装置 / 回路组筛选全局视图">
          <PlantTree onSelect={handleTreeSelect} />
        </Panel>
        <Panel title="等级分布概览" subtitle="按当前筛选范围快速定位风险等级分布">
          <div className="ui-grade-grid">
            {gradeCards.map((item) => (
              <GradePill
                key={item.grade}
                grade={item.grade}
                count={item.count}
                active={gradeFilter === item.grade}
                onClick={() => setGradeFilter((prev) => (prev === item.grade ? '' : item.grade))}
              />
            ))}
          </div>
        </Panel>
      </PageSection>

      <PageSection columns="sidebar">
        <Panel
          title="装置 / 回路组详情"
          subtitle="聚合查看评分、自控率、平稳率与等级分布，快速回答问题集中在哪。"
          actions={(
            <FilterBar align="right">
              <FilterGroup>
                <select className="ui-select" value={unitFilter} onChange={(e) => handleUnitChange(e.target.value)}>
                  <option value="">全部装置</option>
                  {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                <input className="ui-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索工厂 / 装置 / 回路组" />
              </FilterGroup>
            </FilterBar>
          )}
          padded={false}
        >
          <SortableTable columns={detailCols} rows={detailRows} defaultSort={{ key: 'avg_performance_score', dir: 'desc' }} emptyText="暂无回路组数据" />
        </Panel>

        <div className="ui-stack">
          <Panel title="重点改善回路" subtitle="优先关注低分回路并进入分析详情。">
            <div className="ui-list">
              {worstLoops.map((loop) => (
                <LoopListItem
                  key={loop.tag_name}
                  title={loop.tag_name}
                  meta={loop.unit || '未分配装置'}
                  value={loop.performance_score}
                  tone="danger"
                  onClick={() => navigate(`/assessment/${loop.tag_name}`)}
                />
              ))}
            </div>
          </Panel>
          <Panel title="最佳表现回路" subtitle="用于对标当前运行标杆。">
            <div className="ui-list">
              {topLoops.map((loop) => (
                <LoopListItem
                  key={loop.tag_name}
                  title={loop.tag_name}
                  meta={loop.unit || '未分配装置'}
                  value={loop.performance_score}
                  tone="success"
                  secondary
                />
              ))}
            </div>
          </Panel>
        </div>
      </PageSection>
    </div>
  );
}
