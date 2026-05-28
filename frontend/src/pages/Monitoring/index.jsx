import { useEffect, useMemo, useState } from 'react';
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
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="监控回路" value={summary.total} detail="当前实时监控覆盖" />
        <MetricCard label="平均评分" value={summary.avgScore} detail="实时评估均值" />
        <MetricCard label="平均自控率" value={`${summary.avgAuto}${summary.avgAuto === '—' ? '' : '%'}`} detail="按当前监控窗口计算" />
        <MetricCard label="平均平稳率" value={`${summary.avgStability}${summary.avgStability === '—' ? '' : '%'}`} detail="按当前监控窗口计算" />
      </section>

      <div style={st.tabs}>
        <button onClick={() => setTab('realtime')} style={{ ...st.tab, ...(tab === 'realtime' ? st.tabActive : null) }}>实时监控</button>
        <button onClick={() => setTab('history')} style={{ ...st.tab, ...(tab === 'history' ? st.tabActive : null) }}>历史统计</button>
      </div>

      {tab === 'realtime' ? (
        <section style={st.contentGrid}>
          <div style={st.panelLarge}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>实时运行清单</div>
                <div style={st.panelSub}>面向正式运行环境的监控入口，点击回路进入评估详情。</div>
              </div>
            </div>
            <div style={st.banner(runtime?.degraded ? 'warn' : 'ok')}>
              <div>配置模式：<strong>{runtime?.configured_source || '—'}</strong></div>
              <div>当前生效：<strong>{runtime?.effective_source || '—'}</strong></div>
              <div>回路覆盖：<strong>{runtime?.served_loop_count ?? 0}/{runtime?.expected_loop_count ?? 0}</strong></div>
              <div style={st.bannerDetail}>状态说明：{runtime?.fallback_reason || runtime?.detail || '尚未获取运行数据状态。'}</div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              {loadingRealtime ? <div style={st.state}>加载中...</div> : errorRealtime ? <div style={st.state}>{errorRealtime}</div> : (
                <SortableTable
                  columns={REALTIME_COLS}
                  rows={rows}
                  defaultSort={{ key: 'performance_score', dir: 'asc' }}
                  emptyText="暂无回路数据"
                  onRowClick={(row) => nav(`/assessment/${row.tag_name}`)}
                />
              )}
            </div>
          </div>

          <div style={st.sideColumn}>
            <div style={st.panel}>
              <div style={st.panelHeader}>
                <div>
                  <div style={st.panelTitle}>当前风险关注</div>
                  <div style={st.panelSub}>按实时评分排序的重点回路</div>
                </div>
              </div>
              <div style={st.listBody}>
                {focusLoops.map((loop) => (
                  <button key={loop.tag_name} onClick={() => nav(`/assessment/${loop.tag_name}`)} style={st.loopItem}>
                    <div>
                      <div style={st.loopName}>{loop.tag_name}</div>
                      <div style={st.loopMeta}>{loop.unit || '未分配装置'} · {loop.grade}</div>
                    </div>
                    <div style={st.loopScore}>{loop.performance_score}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={st.panel}>
              <div style={st.panelHeader}>
                <div>
                  <div style={st.panelTitle}>监控说明</div>
                  <div style={st.panelSub}>当前版本以真实数据清单与统计为准</div>
                </div>
              </div>
              <div style={st.textBody}>
                <p>本页当前聚焦正式产品最关键的两类信息：实时回路状态与持久化历史统计。</p>
                <p>若运行数据源降级，页面会持续显示 fallback 原因，不会伪装为真实 TDengine 实时数据。</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section style={st.historyPanel}>
          <div style={st.panelLarge}>
            <div style={st.panelHeaderRow}>
              <div>
                <div style={st.panelTitle}>历史监控统计</div>
                <div style={st.panelSub}>基于持久化聚合快照查看历史评分、自控率与平稳率。</div>
              </div>
              <div style={st.dimensionTabs}>
                {Object.keys(DIMENSION_LABELS).map((key) => (
                  <button key={key} onClick={() => setDim(key)} style={{ ...st.dimensionTab, ...(dim === key ? st.dimensionActive : null) }}>
                    {DIMENSION_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div style={st.banner('neutral')}>
              <div>统计维度：<strong>{DIMENSION_LABELS[dim]}</strong></div>
              <div>数据来源：<strong>{historyTrust?.source || '—'}</strong></div>
              <div>统计点数：<strong>{historyTrust?.point_count ?? 0}</strong></div>
              <div style={st.bannerDetail}>范围：{historyTrust?.scope_type || '—'} / {historyTrust?.scope_ref || '—'}</div>
            </div>

            <div style={{ padding: '0 18px 18px' }}>
              {loadingHistory ? <div style={st.state}>加载中...</div> : errorHistory ? <div style={st.state}>{errorHistory}</div> : (
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={st.th}>时间</th>
                      <th style={{ ...st.th, textAlign: 'right' }}>平均性能评分</th>
                      <th style={{ ...st.th, textAlign: 'right' }}>平均自控率(%)</th>
                      <th style={{ ...st.th, textAlign: 'right' }}>平均平稳率(%)</th>
                      <th style={st.th}>可信度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((point, index) => (
                      <tr key={`${point.label}-${index}`} style={st.row}>
                        <td style={st.td}>{point.label}</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{point.avg_performance_score}</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{point.avg_auto_control_rate}</td>
                        <td style={{ ...st.td, textAlign: 'right' }}>{point.avg_stability_rate}</td>
                        <td style={st.td}>{renderTrust(point.trust)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
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

function renderTrust(trust) {
  if (!trust) return '—';
  const status = trust.trusted ? '可信' : '待确认';
  return `${status} · 完整度 ${Math.round((trust.data_completeness || 0) * 100)}%`;
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  metricLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  metricValue: { fontSize: 30, fontWeight: 800, color: 'var(--text-strong)' },
  metricDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' },
  tabs: { display: 'flex', gap: 10 },
  tab: { height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)', fontWeight: 600 },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 340px', gap: 16 },
  historyPanel: { display: 'grid' },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelHeaderRow: { padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  banner: (tone) => ({ margin: '16px 18px', padding: '12px 14px', borderRadius: 14, border: `1px solid ${tone === 'warn' ? '#fcd34d' : tone === 'ok' ? '#86efac' : 'var(--line)'}`, background: tone === 'warn' ? '#fffbeb' : tone === 'ok' ? '#f0fdf4' : '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, auto)) 1fr', gap: 12, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }),
  bannerDetail: { minWidth: 0 },
  listBody: { padding: 18, display: 'grid', gap: 10 },
  textBody: { padding: 18, display: 'grid', gap: 10, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8 },
  loopItem: { border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' },
  loopName: { fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' },
  loopMeta: { marginTop: 4, fontSize: 12, color: 'var(--text-subtle)' },
  loopScore: { fontSize: 24, fontWeight: 800, color: 'var(--red)' },
  state: { padding: 24, color: 'var(--text-subtle)' },
  dimensionTabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  dimensionTab: { height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)' },
  dimensionActive: { background: 'var(--panel-muted)', color: 'var(--text-strong)', borderColor: '#cbd5e1', fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--text-subtle)', fontWeight: 700, background: 'var(--panel-muted)' },
  row: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '11px 12px', color: 'var(--text-strong)' },
};
