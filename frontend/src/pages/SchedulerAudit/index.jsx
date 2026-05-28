import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';

const STATUS_LABELS = { pending: '待执行', running: '运行中', completed: '已完成', failed: '失败' };
const STATUS_TONES = { pending: 'neutral', running: 'warn', completed: 'ok', failed: 'err' };

export default function SchedulerAudit() {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorJobs, setErrorJobs] = useState('');
  const [errorRuns, setErrorRuns] = useState('');
  const [errorAudit, setErrorAudit] = useState('');

  useEffect(() => {
    api.listFeatures().then(items => setFeatures(items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setErrorJobs('');
    setErrorRuns('');
    setErrorAudit('');
    Promise.allSettled([
      api.getSchedulerJobs().catch(e => { setErrorJobs(e.message); return []; }),
      api.getSchedulerRuns().catch(e => { setErrorRuns(e.message); return []; }),
      api.getAuditEvents().catch(e => { setErrorAudit(e.message); return []; }),
    ]).then(([jobsRes, runsRes, auditRes]) => {
      setJobs(jobsRes.status === 'fulfilled' ? jobsRes.value : []);
      setRuns(runsRes.status === 'fulfilled' ? runsRes.value : []);
      setAuditEvents(auditRes.status === 'fulfilled' ? auditRes.value : []);
      setLoading(false);
    });
  }, []);

  const activeJobs = jobs.filter(j => j.enabled);
  const recentRuns = runs.slice(0, 20);
  const recentAudit = auditEvents.slice(0, 20);

  const reportingEnabled = features.find(f => f.key === 'reporting')?.enabled;

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="调度作业" value={activeJobs.length} detail={`共 ${jobs.length} 个作业定义`} />
        <MetricCard label="最近运行" value={recentRuns.length} detail="最近 20 条运行记录" />
        <MetricCard label="审计事件" value={recentAudit.length} detail="最近 20 条审计记录" />
        <MetricCard label="后端状态" value="只读 API" detail="调度写操作与触发 API 待补齐" tone="neutral" />
      </section>

      <div style={st.banner('neutral')}>
        <div>可调度作业：<strong>{activeJobs.length}/{jobs.length}</strong></div>
        <div>最近运行记录：<strong>{recentRuns.length} 条</strong></div>
        <div>审计事件：<strong>{recentAudit.length} 条（最近 200 条中）</strong></div>
        <div style={st.bannerDetail}>当前调度与审计仅提供只读视图；调度触发、作业编辑、审计筛选将在 Phase 4 补齐。</div>
      </div>

      <div style={st.tabs}>
        {[
          { k: 'jobs', l: '调度作业' },
          { k: 'runs', l: '运行记录' },
          { k: 'audit', l: '审计事件' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ ...st.tab, ...(tab === t.k ? st.tabActive : null) }}>{t.l}</button>
        ))}
      </div>

      <section style={st.contentGrid}>
        <div style={st.panelLarge}>
          <div style={st.panelHeader}>
            <div>
              <div style={st.panelTitle}>
                {tab === 'jobs' ? '调度作业定义' : tab === 'runs' ? '最近运行记录' : '审计事件'}
              </div>
              <div style={st.panelSub}>
                {tab === 'jobs' ? '预定义的定时评估与报表作业。' : tab === 'runs' ? '作业的历史执行记录与状态。' : '关键操作的可追溯审计日志。'}
              </div>
            </div>
          </div>

          {loading ? <div style={st.state}>加载中...</div> : (
            <div style={{ padding: '0 18px 18px' }}>
              {tab === 'jobs' && (
                errorJobs ? <div style={st.state}>{errorJobs}</div> : jobs.length === 0 ? <div style={st.state}>暂无调度作业定义</div> : (
                  <table style={st.table}>
                    <thead><tr>{['作业标识', '类型', 'Cron 表达式', '启用'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>{jobs.map(j => (
                      <tr key={j.job_key} style={st.row}>
                        <td style={st.tdStrong}>{j.job_key}</td>
                        <td style={st.td}>{j.job_type}</td>
                        <td style={st.td}>{j.cron_expr}</td>
                        <td style={st.td}>{j.enabled ? '是' : '否'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )
              )}
              {tab === 'runs' && (
                errorRuns ? <div style={st.state}>{errorRuns}</div> : runs.length === 0 ? <div style={st.state}>暂无运行记录</div> : (
                  <table style={st.table}>
                    <thead><tr>{['运行 ID', '作业 ID', '开始时间', '结束时间', '状态'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>{recentRuns.map(r => (
                      <tr key={r.run_id} style={st.row}>
                        <td style={st.tdStrong}>{r.run_id.slice(0, 20)}...</td>
                        <td style={st.td}>{r.scheduler_job_id}</td>
                        <td style={st.td}>{r.started_at ? new Date(r.started_at).toLocaleString('zh-CN') : '—'}</td>
                        <td style={st.td}>{r.finished_at ? new Date(r.finished_at).toLocaleString('zh-CN') : '—'}</td>
                        <td style={st.td}>{STATUS_LABELS[r.status] || r.status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )
              )}
              {tab === 'audit' && (
                errorAudit ? <div style={st.state}>{errorAudit}</div> : auditEvents.length === 0 ? <div style={st.state}>暂无审计事件</div> : (
                  <table style={st.table}>
                    <thead><tr>{['时间', '事件类型', '操作人', '目标'].map(h => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
                    <tbody>{recentAudit.map(e => (
                      <tr key={e.event_id} style={st.row}>
                        <td style={st.td}>{e.created_at ? new Date(e.created_at).toLocaleString('zh-CN') : '—'}</td>
                        <td style={st.tdStrong}>{e.event_type}</td>
                        <td style={st.td}>{e.actor}</td>
                        <td style={st.td}>{e.target_type} / {e.target_id}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )
              )}
            </div>
          )}
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>使用说明</div>
                <div style={st.panelSub}>当前页面的真实能力与限制</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>调度作业定义来自后端预置配置，运行记录和审计事件来自 PostgreSQL 持久化存储。</p>
              <p>当前页面为只读视图，调度触发、作业编辑、审计筛选等交互能力计划在 Phase 4 补齐。</p>
              <p>所有数据均为真实持久化数据，不包含模拟或演示内容。</p>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>后续计划</div>
                <div style={st.panelSub}>Phase 4 将补齐的能力</div>
              </div>
            </div>
            <div style={st.textBody}>
              <ul style={st.list}>
                <li>调度作业创建/编辑/启用/禁用</li>
                <li>手动触发单次作业执行</li>
                <li>审计事件按类型/时间/操作人筛选</li>
                <li>运行记录状态追踪与详情展开</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, tone }) {
  return (
    <div style={st.metricCard}>
      <div style={st.metricLabel}>{label}</div>
      <div style={{ ...st.metricValue, ...(tone === 'ok' ? { color: 'var(--green-strong)' } : tone === 'warn' ? { color: 'var(--amber-strong)' } : { color: 'var(--text-strong)' }) }}>{value}</div>
      <div style={st.metricDetail}>{detail}</div>
    </div>
  );
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  metricLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  metricValue: { fontSize: 30, fontWeight: 800 },
  metricDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' },
  banner: (tone) => ({ padding: '12px 14px', borderRadius: 14, border: `1px solid ${tone === 'warn' ? '#fcd34d' : '#86efac'}`, background: tone === 'warn' ? '#fffbeb' : '#f0fdf4', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, auto)) 1fr', gap: 12, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }),
  bannerDetail: { minWidth: 0 },
  tabs: { display: 'flex', gap: 10 },
  tab: { height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)', fontWeight: 600 },
  tabActive: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 320px', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelLarge: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  state: { padding: 24, color: 'var(--text-subtle)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', color: 'var(--text-subtle)', fontWeight: 700, background: 'var(--panel-muted)', borderBottom: '1px solid var(--line)' },
  row: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '11px 12px', color: 'var(--text-subtle)' },
  tdStrong: { padding: '11px 12px', color: 'var(--text-strong)', fontWeight: 600 },
  textBody: { padding: 18, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8, display: 'grid', gap: 10 },
  list: { paddingLeft: 20, display: 'grid', gap: 6 },
};
