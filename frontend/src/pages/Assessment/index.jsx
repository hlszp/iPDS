import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import {
  DataHero,
  FilterBar,
  FilterGroup,
  GradePill,
  LoopListItem,
  MetricCard,
  PageSection,
  Panel,
  SectionCaption,
  StateBlock,
  WorkbenchRail,
} from '../../components/ui';

const ASSESS_COLS = [
  { key: 'tag_name', label: '回路名称' },
  { key: 'unit', label: '所属装置' },
  { key: 'oscillation_rate', label: '振荡率(%)', align: 'right' },
  { key: 'stiction_coefficient', label: '粘滞系数', align: 'right' },
  { key: 'saturation_rate', label: '饱和率(%)', align: 'right' },
  { key: 'settling_time', label: '调节时间(s)', align: 'right', render: (v) => (v != null ? v.toFixed(1) : '—') },
  { key: 'good_value_rate', label: '优良值率(%)', align: 'right' },
  { key: 'commissioning_rate', label: '投运率(%)', align: 'right' },
  { key: 'performance_score', label: '性能评分', align: 'right' },
  { key: 'grade', label: '性能等级' },
];

const GRADE_ORDER = ['优', '良', '中', '差', '开环'];

function AssessmentSkeleton() {
  return (
    <div className="ui-stack">
      <div className="ui-skeleton-hero">
        <div className="ui-skeleton-block ui-skeleton-block--title" />
        <div className="ui-skeleton-block ui-skeleton-block--text" />
        <div className="ui-summary-grid">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="ui-skeleton-card" />)}
        </div>
      </div>
      <div className="ui-skeleton-card" />
      <div className="ui-page-section ui-page-section--sidebar">
        <div className="ui-skeleton-card ui-skeleton-card--table" />
        <div className="ui-stack">
          <div className="ui-skeleton-card" />
          <div className="ui-skeleton-card" />
        </div>
      </div>
    </div>
  );
}

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
    return GRADE_ORDER.map((grade) => ({
      grade,
      count: rows.filter((row) => row.grade === grade).length,
    }));
  }, [rows]);

  const focusLoops = [...rows].sort((a, b) => a.performance_score - b.performance_score).slice(0, 5);
  const trust = runtime || {};

  if (loading) return <AssessmentSkeleton />;

  return (
    <div className="ui-stack">
      <DataHero
        title="性能评估工作台"
        subtitle="先用统一筛选条锁定风险范围，再在中间主表核查振荡、粘滞、调节时间与投运质量。"
        aside={(
          <div className="ui-stack">
            <SectionCaption kicker="当前重点" title={focusLoops[0]?.tag_name || '暂无重点回路'} detail={focusLoops[0] ? `${focusLoops[0].unit || '未分配装置'} · ${focusLoops[0].grade}` : '等待评估结果返回后生成优先改善对象。'} />
          </div>
        )}
      >
        <MetricCard label="评估回路" value={summary.total} detail="当前筛选范围" />
        <MetricCard label="平均评分" value={summary.avgScore} detail="实时评估均值" />
        <MetricCard label="平均振荡率" value={`${summary.avgOsc}${summary.avgOsc === '—' ? '' : '%'}`} detail="问题稳定性指标" />
        <MetricCard label="平均粘滞系数" value={summary.avgStiction} detail="阀门粘滞风险" />
      </DataHero>

      <Panel
        title="评估筛选与等级分布"
        subtitle="把等级、振荡阈值和粘滞阈值放在同一条指挥带里，避免像异常页一样散乱堆叠。"
        actions={(
          <FilterBar align="right">
            <FilterGroup>
              <input className="ui-input" type="number" placeholder="振荡率≥" value={minOsc} onChange={(e) => setMinOsc(e.target.value)} />
              <input className="ui-input" type="number" step="0.01" placeholder="粘滞系数≥" value={minStiction} onChange={(e) => setMinStiction(e.target.value)} />
              <button type="button" className="ui-secondary-action" onClick={() => { setMinOsc(''); setMinStiction(''); setGradeFilter(''); }}>清空筛选</button>
            </FilterGroup>
          </FilterBar>
        )}
      >
        <div className="ui-stack">
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
          <SectionCaption kicker="数据范围" title={trust.degraded ? '当前为降级评估' : '当前为实时评估'} detail={trust.fallback_reason || trust.detail || '当前筛选结果来自实时评估数据。'} />
        </div>
      </Panel>

      <PageSection columns="sidebar">
        <div className="ui-stack">
          <Panel title="问题回路评估矩阵" subtitle="中间主表用于快速确认问题类型与优先级，点击后进入单回路分析。" padded={false}>
            <div className="ui-panel__body">
              {error ? (
                <StateBlock type="error" title="评估结果加载失败" detail={error} />
              ) : rows.length === 0 ? (
                <StateBlock type="empty" title="当前筛选下暂无评估结果" detail="这不是系统异常，可能是筛选条件过严，或当前范围内暂无满足条件的回路。" />
              ) : (
                <SortableTable
                  columns={ASSESS_COLS}
                  rows={rows}
                  defaultSort={{ key: 'performance_score', dir: 'asc' }}
                  emptyText="暂无符合筛选条件的回路"
                  onRowClick={(row) => nav(`/assessment/${row.tag_name}`, { state: { sourceTitle: '性能评估', returnLabel: '返回评估矩阵', returnTo: '/assessment' } })}
                />
              )}
            </div>
          </Panel>
        </div>

        <WorkbenchRail title="优先改善回路" subtitle="从发现问题直接进入单回路诊断。">
          {focusLoops.length > 0 ? focusLoops.map((loop) => (
            <LoopListItem
              key={loop.tag_name}
              title={loop.tag_name}
              meta={`${loop.unit || '未分配装置'} · ${loop.grade}`}
              value={loop.performance_score.toFixed(1)}
              tone="danger"
              onClick={() => nav(`/assessment/${loop.tag_name}`, { state: { sourceTitle: '优先改善回路', returnLabel: '返回评估矩阵', returnTo: '/assessment' } })}
            />
          )) : <StateBlock type="empty" title="当前没有重点回路" detail="请调整筛选条件，或等待评估结果返回。" />}
          <Panel title="评估使用说明" subtitle="当前页只展示真实评估结果，不生成额外模拟结论。">
            <div className="ui-text-block">
              <p>先在这页锁定问题对象，再进入单回路详情查看诊断证据与整定入口。</p>
              <p>如果运行数据源降级，页面会保留状态说明，但不会伪装为真实生产实时数据。</p>
            </div>
          </Panel>
        </WorkbenchRail>
      </PageSection>
    </div>
  );
}
