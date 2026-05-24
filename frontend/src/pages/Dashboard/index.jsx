import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import KpiBar from './KpiBar';
import Heatmap from './Heatmap';
import Top10Table from './Top10Table';
import TrendChart from './TrendChart';
import EventTimeline from './EventTimeline';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState(null);
  const [setupChecking, setSetupChecking] = useState(true);
  const nav = useNavigate();

  const reloadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, readinessData] = await Promise.all([
        api.getDashboard(),
        api.getCommissioningReadiness(),
      ]);
      setData(dashboard);
      setReadiness(readinessData);
    } catch (e) {
      setError(e.message || '驾驶舱数据加载失败');
      setData(null);
    } finally {
      setLoading(false);
      setSetupChecking(false);
    }
  };

  useEffect(() => {
    reloadDashboard();
  }, []);

  const heatmapMap = {};
  (data?.heatmap || []).forEach(r => { heatmapMap[r.unit] = r.counts; });

  const top10 = (data?.top10 || []).map((r) => ({
    tag: r.tag_name,
    unit: r.unit,
    grade: r.grade === '差' ? 'D' : r.grade === '中' ? 'C' : r.grade === '良' ? 'B' : 'A',
    faults: (r.faults || []).map(f => ({ t: f, c: f === '阀门粘滞' ? 'stiction' : f.indexOf('振荡') >= 0 ? 'osc' : 'other' })),
    w: r.weight,
  }));

  const kpi = data?.kpi || {};
  const showSetupBanner = !setupChecking && readiness && readiness.status !== 'ready';
  const heatmapEmpty = Object.keys(heatmapMap).length === 0;
  const trendsEmpty = !data?.trends || data.trends.length === 0;
  const eventsEmpty = !data?.events || data.events.length === 0;
  const top10Empty = top10.length === 0;
  const setupActionPath = readiness?.next_action === 'commissioning' ? '/commissioning' : '/config';
  const setupPrimaryLabel = readiness?.status === 'incomplete' ? '继续补全' : '开始配置';

  return (
    <>
      {showSetupBanner && (
        <div className={styles.setupBanner}>
          <div>
            <div className={styles.setupTitle}>{readiness.status === 'incomplete' ? '回路配置还未完成评估准备' : '首次使用请先完成回路配置'}</div>
            <div className={styles.setupText}>{readiness.message}</div>
          </div>
          <div className={styles.setupActions}>
            <button className={styles.setupPrimary} onClick={() => nav(setupActionPath)}>{setupPrimaryLabel}</button>
            <button className={styles.setupSecondary} onClick={reloadDashboard}>重新检查</button>
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : error ? (
        <>
          <div className={styles.kpiBar}>{Array(4).fill(0).map((_,i)=><div key={i} className={`${styles.kpiCard} ${styles.skel}`} style={{height:80}}/>)}</div>
          <div className={styles.grid}>
            {['装置回路健康总览','Top 10 问题回路','自控率趋势（近30天）','最近告警与操作'].map(title => (
              <div key={title} className={styles.panel}>
                <div className={styles.phead}><span>{title}</span></div>
                <div className={styles.pbody}>
                  <PanelState title="加载失败" text={error} onRetry={reloadDashboard} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <KpiBar autoRate={kpi.autoRate} stabilityRate={kpi.stabilityRate} problems={kpi.problems} alarms={kpi.alarms} />
          <div className={styles.grid}>
            <div className={styles.panel}>
              <div className={styles.phead}><span>装置回路健康总览</span><span className={styles.pact}>周报 ▾</span></div>
              <div className={styles.pbody}>
                {heatmapEmpty ? (
                  <PanelState title="暂无评估总览" text={showSetupBanner ? '完成回路配置并通过关键字段校验后，这里会按装置展示各评级回路分布。' : '当前没有可展示的装置评估结果。'} onRetry={reloadDashboard} />
                ) : (
                  <Heatmap data={heatmapMap} onCellClick={(unit, grade) => nav(`/config?unit=${encodeURIComponent(unit)}&grade=${encodeURIComponent(grade)}`)} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>Top 10 问题回路</span><span className={styles.pact}>查看全部 →</span></div>
              <div className={styles.pbody} style={{padding:0}}>
                {top10Empty ? (
                  <PanelState title="暂无问题回路" text={showSetupBanner ? '完成配置、校验和评估后，这里会自动列出最需要优先处理的回路。' : '当前没有需要重点关注的问题回路。'} onRetry={reloadDashboard} />
                ) : (
                  <Top10Table data={top10} onRowClick={t => nav(`/loop/${t.tag}`)} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>自控率趋势（近30天）</span><span className={styles.pact}>装置对比 ▾</span></div>
              <div className={styles.pbody} style={{padding:'8px 12px'}}>
                {trendsEmpty ? (
                  <PanelState title="暂无趋势数据" text="暂无可用的装置趋势数据。完成评估后这里会显示近 30 天变化。" onRetry={reloadDashboard} />
                ) : (
                  <TrendChart trends={data.trends} />
                )}
              </div>
            </div>
            <div className={styles.panel}>
              <div className={styles.phead}><span>最近告警与操作</span><span className={styles.pact}>全部 →</span></div>
              <div className={styles.pbody}>
                {eventsEmpty ? (
                  <PanelState title="暂无近期事件" text="这里会展示最近的评估告警、整定动作和关键运行事件。" onRetry={reloadDashboard} />
                ) : (
                  <EventTimeline events={data.events || []} />
                )}
              </div>
            </div>
          </div>
          <div className={styles.sbar}>
            <span><span className={`${styles.sdot} ${styles.ok}`} />数据更新: {new Date().toLocaleString('zh-CN')}</span>
            <span><span className={`${styles.sdot} ${styles.ok}`} />评估引擎: 运行中</span>
            <span>下一批次: 明天 06:00</span>
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
      <div className={styles.kpiBar}>{Array(4).fill(0).map((_,i)=><div key={i} className={`${styles.kpiCard} ${styles.skel}`} style={{height:80}}/>)}</div>
      <div className={styles.grid}>
        {Array(4).fill(0).map((_,i)=><div key={i} className={`${styles.panel}`}><div className={styles.pbody}><div className={styles.skel} style={{height:'100%'}}/></div></div>)}
      </div>
    </>
  );
}
