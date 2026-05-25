import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import KpiBar from './KpiBar';
import Heatmap from './Heatmap';
import Top10Table from './Top10Table';
import TrendChart from './TrendChart';
import EventTimeline from './EventTimeline';
import styles from './Dashboard.module.css';

const PANEL_META = {
  heatmap: { title: '装置回路健康总览' },
  top10: { title: 'Top 10 问题回路' },
  trends: { title: '自控率趋势（近30天）' },
  events: { title: '最近告警与操作' },
};

const DASHBOARD_REFRESH_MS = 30000;
const READINESS_REFRESH_MS = 120000;

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');
  const [lastDashboardRefreshAt, setLastDashboardRefreshAt] = useState(null);
  const [lastReadinessRefreshAt, setLastReadinessRefreshAt] = useState(null);
  const nav = useNavigate();

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setDashboardLoading(true);
    setDashboardError('');
    try {
      const data = await api.getDashboard();
      setDashboard(data);
      setLastDashboardRefreshAt(new Date());
    } catch (e) {
      setDashboardError(e.message || '驾驶舱数据加载失败');
      if (!silent) setDashboard(null);
    } finally {
      if (!silent) setDashboardLoading(false);
    }
  }, []);

  const loadReadiness = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setReadinessLoading(true);
    setReadinessError('');
    try {
      const data = await api.getCommissioningReadiness();
      setReadiness(data);
      setLastReadinessRefreshAt(new Date());
    } catch (e) {
      setReadinessError(e.message || '准备状态检查失败');
      if (!silent) setReadiness(null);
    } finally {
      if (!silent) setReadinessLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadReadiness();

    const dashboardTimer = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, DASHBOARD_REFRESH_MS);
    const readinessTimer = window.setInterval(() => {
      loadReadiness({ silent: true });
    }, READINESS_REFRESH_MS);

    return () => {
      window.clearInterval(dashboardTimer);
      window.clearInterval(readinessTimer);
    };
  }, [loadDashboard, loadReadiness]);

  const heatmapMap = useMemo(() => {
    const map = {};
    (dashboard?.heatmap || []).forEach((row) => {
      map[row.unit] = row.counts;
    });
    return map;
  }, [dashboard]);

  const top10 = useMemo(() => (
    (dashboard?.top10 || []).map((row) => ({
      tag: row.tag_name,
      unit: row.unit,
      grade: row.grade === '差' ? 'D' : row.grade === '中' ? 'C' : row.grade === '良' ? 'B' : 'A',
      faults: (row.faults || []).map((fault) => ({
        t: fault,
        c: fault === '阀门粘滞' ? 'stiction' : fault.includes('振荡') ? 'osc' : 'other',
      })),
      w: row.weight,
    }))
  ), [dashboard]);

  const warnings = readiness?.warnings || [];
  const showSetupBanner = !readinessLoading && readiness && readiness.status !== 'ready';
  const setupPrimaryLabel = readiness?.status === 'incomplete' ? '继续补全' : '开始配置';
  const setupPrimaryAction = () => {
    if (warnings.length > 0) {
      const first = warnings[0];
      nav(`/config?tag=${encodeURIComponent(first.tag)}&warningField=${encodeURIComponent(first.field)}&source=dashboard-warning`);
      return;
    }
    nav(readiness?.next_action === 'commissioning' ? '/commissioning' : '/config');
  };

  return (
    <>
      {showSetupBanner && (
        <div className={styles.setupBanner}>
          <div className={styles.setupBody}>
            <div>
              <div className={styles.setupTitle}>{readiness.status === 'incomplete' ? '回路配置还未完成评估准备' : '首次使用请先完成回路配置'}</div>
              <div className={styles.setupText}>{readiness.message}</div>
              {!!readinessError && <div className={styles.setupError}>{readinessError}</div>}
            </div>
            {warnings.length > 0 && (
              <div className={styles.warningList}>
                {warnings.map((warning, index) => (
                  <button
                    key={`${warning.tag}-${warning.field}-${index}`}
                    className={styles.warningItem}
                    onClick={() => nav(`/config?tag=${encodeURIComponent(warning.tag)}&warningField=${encodeURIComponent(warning.field)}&source=dashboard-warning`)}
                  >
                    <span className={styles.warningTag}>{warning.tag}</span>
                    <span className={styles.warningIssue}>{warning.issue}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.setupActions}>
            <button className={styles.setupPrimary} onClick={setupPrimaryAction}>{setupPrimaryLabel}</button>
            <button className={styles.setupSecondary} onClick={() => loadReadiness()}>重新检查</button>
          </div>
        </div>
      )}

      {dashboardLoading ? (
        <Skeleton />
      ) : (
        <>
          <KpiBar
            autoRate={dashboard?.kpi?.autoRate}
            stabilityRate={dashboard?.kpi?.stabilityRate}
            problems={dashboard?.kpi?.problems}
            alarms={dashboard?.kpi?.alarms}
          />
          <div className={styles.grid}>
            <div className={styles.panel}>
              <div className={styles.phead}><span>{PANEL_META.heatmap.title}</span><span className={styles.pact}>周报 ▾</span></div>
              <div className={styles.pbody}>
                {dashboardError ? (
                  <PanelState title="加载失败" text={dashboardError} onRetry={() => loadDashboard()} />
                ) : Object.keys(heatmapMap).length === 0 ? (
                  <PanelState title="暂无评估总览" text={showSetupBanner ? '完成回路配置并通过关键字段校验后，这里会按装置展示各评级回路分布。' : '当前没有可展示的装置评估结果。'} onRetry={() => loadDashboard()} />
                ) : (
                  <Heatmap data={heatmapMap} onCellClick={(unit, grade) => nav(`/config?unit=${encodeURIComponent(unit)}&grade=${encodeURIComponent(grade)}`)} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>{PANEL_META.top10.title}</span><span className={styles.pact}>查看全部 →</span></div>
              <div className={styles.pbody} style={{ padding: 0 }}>
                {dashboardError ? (
                  <PanelState title="加载失败" text={dashboardError} onRetry={() => loadDashboard()} />
                ) : top10.length === 0 ? (
                  <PanelState title="暂无问题回路" text={showSetupBanner ? '完成配置、校验和评估后，这里会自动列出最需要优先处理的回路。' : '当前没有需要重点关注的问题回路。'} onRetry={() => loadDashboard()} />
                ) : (
                  <Top10Table data={top10} onRowClick={(item) => nav(`/loop/${item.tag}`)} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>{PANEL_META.trends.title}</span><span className={styles.pact}>装置对比 ▾</span></div>
              <div className={styles.pbody} style={{ padding: '8px 12px' }}>
                {dashboardError ? (
                  <PanelState title="加载失败" text={dashboardError} onRetry={() => loadDashboard()} />
                ) : !dashboard?.trends || dashboard.trends.length === 0 ? (
                  <PanelState title="暂无趋势数据" text="暂无可用的装置趋势数据。完成评估后这里会显示近 30 天变化。" onRetry={() => loadDashboard()} />
                ) : (
                  <TrendChart trends={dashboard.trends} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>{PANEL_META.events.title}</span><span className={styles.pact}>全部 →</span></div>
              <div className={styles.pbody}>
                {dashboardError ? (
                  <PanelState title="加载失败" text={dashboardError} onRetry={() => loadDashboard()} />
                ) : !dashboard?.events || dashboard.events.length === 0 ? (
                  <PanelState title="暂无近期事件" text="这里会展示最近的评估告警、整定动作和关键运行事件。" onRetry={() => loadDashboard()} />
                ) : (
                  <EventTimeline events={dashboard.events || []} />
                )}
              </div>
            </div>
          </div>
          <div className={styles.sbar}>
            <span><span className={`${styles.sdot} ${styles.ok}`} />数据更新: {lastDashboardRefreshAt ? lastDashboardRefreshAt.toLocaleString('zh-CN') : '—'}</span>
            <span><span className={`${styles.sdot} ${dashboardError ? styles.warn : styles.ok}`} />评估引擎: {dashboardError ? '刷新异常' : '自动刷新中（30s）'}</span>
            <span>准备状态: {lastReadinessRefreshAt ? `已同步（${lastReadinessRefreshAt.toLocaleTimeString('zh-CN')})` : '待同步'}</span>
          </div>
        </>
      )}
    </>
  );
}

function PanelState({ title, text, onRetry }) {
  return (
    <div className={styles.panelState}>
      <div className={styles.panelStateTitle}>{title}</div>
      <div className={styles.panelStateText}>{text}</div>
      <button className={styles.retryBtn} onClick={onRetry}>重试</button>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <div className={styles.kpiBar}>{Array(4).fill(0).map((_, i) => <div key={i} className={`${styles.kpiCard} ${styles.skel}`} style={{ height: 80 }} />)}</div>
      <div className={styles.grid}>
        {Array(4).fill(0).map((_, i) => <div key={i} className={styles.panel}><div className={styles.pbody}><div className={styles.skel} style={{ height: '100%' }} /></div></div>)}
      </div>
    </>
  );
}
