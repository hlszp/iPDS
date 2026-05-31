import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import {
  FilterBar,
  FilterGroup,
  LoopListItem,
  MetricCard,
  Panel,
  StateBlock,
  StatusBanner,
} from '../../components/ui';

const REALTIME_COLS = [
  { key: 'tag_name', label: '回路名称' },
  { key: 'unit', label: '所属装置' },
  { key: 'self_control_rate', label: '自控率(%)', align: 'right' },
  { key: 'stability_rate', label: '平稳率(%)', align: 'right' },
  { key: 'performance_score', label: '性能评分', align: 'right' },
  { key: 'grade', label: '性能等级' },
];

const HISTORY_COLS = [
  { key: 'label', label: '时间' },
  { key: 'avg_performance_score', label: '平均性能评分', align: 'right' },
  { key: 'avg_auto_control_rate', label: '平均自控率(%)', align: 'right' },
  { key: 'avg_stability_rate', label: '平均平稳率(%)', align: 'right' },
  { key: 'trust', label: '可信度', render: (value) => renderTrust(value) },
];

const DIMENSION_LABELS = { hour: '小时', day: '日', month: '月' };

export default function Monitoring() {
  const nav = useNavigate();
  const [tab, setTab] = useState('realtime');
  const [rows, setRows] = useState([]);
  const [runtime, setRuntime] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTrust, setHistoryTrust] = useState(null);
  const [dim, setDim] = useState('hour');
  const [loadingRealtime, setLoadingRealtime] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorRealtime, setErrorRealtime] = useState('');
  const [errorHistory, setErrorHistory] = useState('');

  useEffect(() => {
    setLoadingRealtime(true);
    setErrorRealtime('');
    api.getMonitoringRealtime({ sort_by: 'performance_score', sort_dir: 'asc' })
      .then((data) => {
        setRows(data.rows || []);
        setRuntime(data.runtime_provider || null);
      })
      .catch((e) => setErrorRealtime(e.message || '加载失败'))
      .finally(() => setLoadingRealtime(false));
  }, []);

  useEffect(() => {
    setLoadingHistory(true);
    setErrorHistory('');
    api.getMonitoringHistory({ dimension: dim })
      .then((data) => {
        setHistory(data.points || []);
        setHistoryTrust(data.trust || null);
      })
      .catch((e) => {
        setErrorHistory(e.message || '历史统计加载失败');
        setHistory([]);
        setHistoryTrust(null);
      })
      .finally(() => setLoadingHistory(false));
  }, [dim]);

  const summary = useMemo(() => {
    if (!rows.length) return { total: 0, avgScore: '—', avgAuto: '—', avgStability: '—' };
    const total = rows.length;
    const avgScore = (rows.reduce((sum, row) => sum + (row.performance_score || 0), 0) / total).toFixed(1);
    const avgAuto = (rows.reduce((sum, row) => sum + (row.self_control_rate || 0), 0) / total).toFixed(1);
    const avgStability = (rows.reduce((sum, row) => sum + (row.stability_rate || 0), 0) / total).toFixed(1);
    return { total, avgScore, avgAuto, avgStability };
  }, [rows]);

  const focusLoops = rows.slice(0, 5);

  return (
    <div className="ui-stack">
      <section className="ui-summary-grid">
        <MetricCard label="监控回路" value={summary.total} detail="当前实时监控覆盖" />
        <MetricCard label="平均评分" value={summary.avgScore} detail="实时评估均值" />
        <MetricCard label="平均自控率" value={`${summary.avgAuto}${summary.avgAuto === '—' ? '' : '%'}`} detail="按当前监控窗口计算" />
        <MetricCard label="平均平稳率" value={`${summary.avgStability}${summary.avgStability === '—' ? '' : '%'}`} detail="按当前监控窗口计算" />
      </section>

      <FilterBar align="left">
        <FilterGroup>
          <button type="button" className={`ui-tab ${tab === 'realtime' ? 'is-active' : ''}`} onClick={() => setTab('realtime')}>实时监控</button>
          <button type="button" className={`ui-tab ${tab === 'history' ? 'is-active' : ''}`} onClick={() => setTab('history')}>历史统计</button>
        </FilterGroup>
      </FilterBar>

      {tab === 'realtime' ? (
        <div className="ui-page-section ui-page-section--sidebar">
          <Panel title="实时运行清单" subtitle="先看当前风险，再顺着详情入口进入分析和整定。" padded={false}>
            <div style={{ padding: '16px 18px 18px', display: 'grid', gap: '16px' }}>
              <StatusBanner
                tone={runtime?.degraded ? 'warn' : 'ok'}
                items={[
                  { label: '配置模式', value: runtime?.configured_source || '—' },
                  { label: '当前生效', value: runtime?.effective_source || '—' },
                  { label: '回路覆盖', value: `${runtime?.served_loop_count ?? 0}/${runtime?.expected_loop_count ?? 0}` },
                ]}
                detail={runtime?.fallback_reason || runtime?.detail || '尚未获取运行数据状态。'}
              />
              {loadingRealtime ? (
                <StateBlock type="loading" title="实时监控加载中" detail="正在拉取当前窗口内的回路评分与运行表现。" />
              ) : errorRealtime ? (
                <StateBlock type="error" title="实时监控加载失败" detail={errorRealtime} action={<button type="button" className="ui-secondary-action" onClick={() => window.location.reload()}>重新加载页面</button>} />
              ) : (
                <SortableTable
                  columns={REALTIME_COLS}
                  rows={rows}
                  defaultSort={{ key: 'performance_score', dir: 'asc' }}
                  emptyText="暂无回路数据"
                  onRowClick={(row) => nav(`/assessment/${row.tag_name}`, { state: { sourceTitle: '实时监控', returnLabel: '返回实时监控', returnTo: '/monitoring' } })}
                />
              )}
            </div>
          </Panel>

          <div className="ui-stack">
            <Panel title="当前风险关注" subtitle="按实时评分排序的重点回路。">
              <div className="ui-list">
                {focusLoops.map((loop) => (
                  <LoopListItem
                    key={loop.tag_name}
                    title={loop.tag_name}
                    meta={`${loop.unit || '未分配装置'} · ${loop.grade}`}
                    value={loop.performance_score}
                    tone="danger"
                    onClick={() => nav(`/assessment/${loop.tag_name}`, { state: { sourceTitle: '当前风险关注', returnLabel: '返回实时监控', returnTo: '/monitoring' } })}
                  />
                ))}
              </div>
            </Panel>
            <Panel title="监控说明" subtitle="当前版本以真实数据清单与持久化统计为准。">
              <div className="ui-text-block">
                <p>本页聚焦两类信息：实时回路状态与历史统计走势。</p>
                <p>若运行数据源降级，页面会持续显示 fallback 原因，不会伪装为真实 TDengine 实时数据。</p>
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel
          title="历史监控统计"
          subtitle="基于持久化聚合快照查看历史评分、自控率与平稳率。"
          actions={(
            <FilterBar align="right">
              <FilterGroup>
                {Object.keys(DIMENSION_LABELS).map((key) => (
                  <button key={key} type="button" className={`ui-tab ${dim === key ? 'is-active' : ''}`} onClick={() => setDim(key)}>
                    {DIMENSION_LABELS[key]}
                  </button>
                ))}
              </FilterGroup>
            </FilterBar>
          )}
          padded={false}
        >
          <div style={{ padding: '16px 18px 18px', display: 'grid', gap: '16px' }}>
            <StatusBanner
              tone="neutral"
              items={[
                { label: '统计维度', value: DIMENSION_LABELS[dim] },
                { label: '数据来源', value: historyTrust?.source || '—' },
                { label: '统计点数', value: historyTrust?.point_count ?? 0 },
              ]}
              detail={`范围：${historyTrust?.scope_type || '—'} / ${historyTrust?.scope_ref || '—'}`}
            />
            {loadingHistory ? (
              <StateBlock type="loading" title="历史统计加载中" detail="正在拉取所选维度的持久化监控快照。" />
            ) : errorHistory ? (
              <StateBlock type="error" title="历史统计加载失败" detail={errorHistory} action={<button type="button" className="ui-secondary-action" onClick={() => setDim(dim)}>重试当前维度</button>} />
            ) : (
              <SortableTable columns={HISTORY_COLS} rows={history.map((point) => ({ ...point, trust: point.trust }))} emptyText="暂无历史统计数据" />
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

function renderTrust(trust) {
  if (!trust) return '—';
  const status = trust.trusted ? '可信' : '待确认';
  return `${status} · 完整度 ${Math.round((trust.data_completeness || 0) * 100)}%`;
}
