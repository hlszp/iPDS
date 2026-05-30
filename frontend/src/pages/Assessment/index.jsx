import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import {
  FilterBar,
  FilterGroup,
  GradePill,
  LoopListItem,
  MetricCard,
  Panel,
  StateBlock,
  StatusBanner,
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

  return (
    <div className="ui-stack">
      <section className="ui-summary-grid">
        <MetricCard label="评估回路" value={summary.total} detail="当前筛选范围" />
        <MetricCard label="平均评分" value={summary.avgScore} detail="实时评估均值" />
        <MetricCard label="平均振荡率" value={`${summary.avgOsc}${summary.avgOsc === '—' ? '' : '%'}`} detail="问题稳定性指标" />
        <MetricCard label="平均粘滞系数" value={summary.avgStiction} detail="阀门粘滞风险" />
      </section>

      <StatusBanner
        tone={runtime?.degraded ? 'warn' : 'ok'}
        items={[
          { label: '配置模式', value: runtime?.configured_source || '—' },
          { label: '当前生效', value: runtime?.effective_source || '—' },
          { label: '回路覆盖', value: `${runtime?.served_loop_count ?? 0}/${runtime?.expected_loop_count ?? 0}` },
        ]}
        detail={runtime?.fallback_reason || runtime?.detail || '尚未获取运行数据状态。'}
      />

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

      <div className="ui-page-section ui-page-section--sidebar">
        <Panel
          title="问题回路评估矩阵"
          subtitle="先筛出高风险对象，再进入单回路详情核查证据并推进整定。"
          actions={(
            <FilterBar align="right">
              <FilterGroup>
                <input className="ui-input" type="number" placeholder="振荡率≥" value={minOsc} onChange={(e) => setMinOsc(e.target.value)} />
                <input className="ui-input" type="number" step="0.01" placeholder="粘滞系数≥" value={minStiction} onChange={(e) => setMinStiction(e.target.value)} />
                <button type="button" className="ui-secondary-action" onClick={() => { setMinOsc(''); setMinStiction(''); setGradeFilter(''); }}>清空筛选</button>
              </FilterGroup>
            </FilterBar>
          )}
          padded={false}
        >
          <div style={{ padding: '0 18px 18px' }}>
            {loading ? (
              <StateBlock type="loading" title="评估结果加载中" detail="正在汇总回路评分、振荡、粘滞与投运指标。" />
            ) : error ? (
              <StateBlock type="error" title="评估结果加载失败" detail={error} />
            ) : (
              <SortableTable columns={ASSESS_COLS} rows={rows} defaultSort={{ key: 'performance_score', dir: 'asc' }} emptyText="暂无符合筛选条件的回路" onRowClick={(row) => nav(`/assessment/${row.tag_name}`)} />
            )}
          </div>
        </Panel>

        <div className="ui-stack">
          <Panel title="优先改善回路" subtitle="从发现问题顺畅进入分析问题。">
            <div className="ui-list">
              {focusLoops.map((loop) => (
                <LoopListItem
                  key={loop.tag_name}
                  title={loop.tag_name}
                  meta={`${loop.unit || '未分配装置'} · ${loop.grade}`}
                  value={loop.performance_score.toFixed(1)}
                  tone="danger"
                  onClick={() => nav(`/assessment/${loop.tag_name}`)}
                />
              ))}
            </div>
          </Panel>

          <Panel title="评估使用说明" subtitle="当前页只展示真实评估结果，不生成额外模拟结论。">
            <div className="ui-text-block">
              <p>本页用于筛选问题回路并进入单回路诊断详情。</p>
              <p>如果运行数据源降级，筛选结果仍会明确标注来源状态，不会伪装为真实实时数据。</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
