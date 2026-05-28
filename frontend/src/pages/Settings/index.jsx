import { useState, useEffect } from 'react';
import { api } from '../../api/client';

const RUNTIME_OPTIONS = [
  { value: 'mock', label: 'Mock 演示数据', desc: '使用内置合成回路数据进行评估与监控。' },
  { value: 'real', label: 'TDengine 真实数据', desc: '连接生产 TDengine 实例读取运行时数据。' },
  { value: 'auto-demo', label: '自动回退演示模式', desc: '优先使用真实数据，不可用时自动降级为演示数据。' },
];

const FEATURE_LABELS = {
  assessment: '回路评估',
  diagnosis: '故障诊断',
  identification: '系统辨识',
  tuning: 'PID 整定',
  simulation: '闭环仿真',
  reporting: '报告生成',
};

export default function Settings() {
  const [features, setFeatures] = useState([]);
  const [users, setUsers] = useState([]);
  const [runtimeSource, setRuntimeSource] = useState(null);
  const [featureError, setFeatureError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pds_user') || '{}'); } catch { return {}; }
  });
  const isAdmin = user.role === 'admin';

  const loadFeatures = async () => {
    setFeatureError('');
    try {
      setFeatures(await api.listFeatures());
    } catch (e) {
      setFeatureError(e.message || '功能开关加载失败');
    }
  };

  const loadRuntimeSource = async () => {
    setRuntimeError('');
    try {
      setRuntimeSource(await api.getRuntimeSource());
    } catch (e) {
      setRuntimeError(e.message || '运行数据源状态加载失败');
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setUsersError('');
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      setUsersError(e.message || '用户列表加载失败');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadFeatures();
    loadRuntimeSource();
    loadUsers();
  }, []);

  const toggleFeature = async (key, enabled) => {
    try {
      await api.updateFeature(key, !enabled);
      setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f));
    } catch (e) {
      setFeatureError(e.message || '功能开关更新失败');
    }
  };

  const changeRuntimeSource = async (source) => {
    try {
      const next = await api.updateRuntimeSource(source);
      setRuntimeSource(next);
    } catch (e) {
      setRuntimeError(e.message || '运行数据源切换失败');
    }
  };

  const validateRuntimeSource = async () => {
    try {
      const next = await api.validateRuntimeSource();
      setRuntimeSource(next);
    } catch (e) {
      setRuntimeError(e.message || '运行数据源探测失败');
    }
  };

  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <div style={st.page}>
      <section style={st.summaryGrid}>
        <MetricCard label="当前生效" value={runtimeSource?.effective_source || '—'} detail={`配置模式: ${runtimeSource?.configured_source || '—'}`} />
        <MetricCard label="回路覆盖" value={`${runtimeSource?.served_loop_count ?? 0}/${runtimeSource?.expected_loop_count ?? 0}`} detail={runtimeSource?.degraded ? `已降级: ${runtimeSource?.fallback_reason || runtimeSource?.detail}` : '运行数据正常'} tone={runtimeSource?.degraded ? 'warn' : 'ok'} />
        <MetricCard label="功能模块" value={`${enabledCount}/${features.length || 0}`} detail="已启用功能模块数量" />
        <MetricCard label="当前用户" value={user.display_name || user.username || '—'} detail={isAdmin ? '管理员' : user.role === 'engineer' ? '工程师' : '查看者'} />
      </section>

      <div style={st.banner(runtimeSource?.degraded ? 'warn' : 'ok')}>
        <div>配置模式：<strong>{runtimeSource?.configured_source || '—'}</strong></div>
        <div>当前生效：<strong>{runtimeSource?.effective_source || '—'}</strong></div>
        <div>回路覆盖：<strong>{runtimeSource?.served_loop_count ?? 0}/{runtimeSource?.expected_loop_count ?? 0}</strong></div>
        <div style={st.bannerDetail}>状态说明：{runtimeSource?.fallback_reason || runtimeSource?.detail || '尚未读取运行数据源状态。'}</div>
      </div>

      <section style={st.contentGrid}>
        <div style={st.mainColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>运行数据源</div>
                <div style={st.panelSub}>配置数据源模式、验证可用性、查看降级与覆盖情况。</div>
              </div>
            </div>
            {runtimeError && <InlineError text={runtimeError} onRetry={loadRuntimeSource} />}
            <div style={st.optionBody}>
              {RUNTIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => changeRuntimeSource(option.value)}
                  style={{
                    ...st.optionCard,
                    borderColor: runtimeSource?.configured_source === option.value ? 'var(--accent)' : 'var(--line)',
                    background: runtimeSource?.configured_source === option.value ? 'rgba(20,184,166,0.06)' : '#fff',
                  }}
                >
                  <div style={st.optionName}>{option.label}</div>
                  <div style={st.optionDesc}>{option.desc}</div>
                  {runtimeSource?.configured_source === option.value && (
                    <div style={st.optionActive}>当前选择</div>
                  )}
                </button>
              ))}
              <button onClick={validateRuntimeSource} style={st.validateBtn}>探测真实数据源可用性</button>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>功能开关</div>
                <div style={st.panelSub}>按模块启用或禁用平台能力。功能开关变化对应到模块可见性与 API 可用性。</div>
              </div>
            </div>
            {featureError && <InlineError text={featureError} onRetry={loadFeatures} />}
            <div style={st.featureBody}>
              {features.map(f => (
                <div key={f.key} style={st.featureRow}>
                  <div>
                    <div style={st.featureName}>{FEATURE_LABELS[f.key] || f.key}</div>
                    <div style={st.featureKey}>{f.key}</div>
                  </div>
                  <button onClick={() => toggleFeature(f.key, f.enabled)} style={st.toggle(f.enabled)}>
                    <span style={st.toggleKnob(f.enabled)} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div style={st.panel}>
              <div style={st.panelHeader}>
                <div>
                  <div style={st.panelTitle}>用户管理</div>
                  <div style={st.panelSub}>只读用户列表，便于管理员核对账号与权限。新增与编辑用户将在此处逐步补齐。</div>
                </div>
              </div>
              {usersError ? (
                <InlineError text={usersError} onRetry={loadUsers} />
              ) : loadingUsers ? (
                <div style={st.state}>正在加载用户列表...</div>
              ) : (
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={st.th}>用户名</th>
                      <th style={st.th}>显示名</th>
                      <th style={st.th}>角色</th>
                      <th style={st.th}>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.username} style={st.row}>
                        <td style={st.tdStrong}>{u.username}</td>
                        <td style={st.td}>{u.display_name || '—'}</td>
                        <td style={st.td}>{roleLabel(u.role)}</td>
                        <td style={st.td}>{u.created_at ? new Date(u.created_at).toLocaleString('zh-CN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div style={st.sideColumn}>
          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>使用说明</div>
                <div style={st.panelSub}>当前页面的真实控制面语义</div>
              </div>
            </div>
            <div style={st.textBody}>
              <p>运行数据源的切换直接影响 Overview / Monitoring / Assessment 的数据来源与可信提示。</p>
              <p>功能开关按模块控制整个平台的可见性与可用状态；关闭一个模块不会删除已有数据。</p>
              <p>用户管理当前提供只读视图；后续将补齐新建、编辑、删除和角色变更能力。</p>
            </div>
          </div>

          <div style={st.panel}>
            <div style={st.panelHeader}>
              <div>
                <div style={st.panelTitle}>部署拓扑</div>
                <div style={st.panelSub}>FastAPI + PostgreSQL + TDengine + React</div>
              </div>
            </div>
            <div style={st.textBody}>
              <div style={{ ...st.topologyRow, borderTopColor: 'var(--accent)' }}>
                <div style={st.topoLayer}>React 前端</div>
                <div style={st.topoNote}>Nginx → :5173</div>
              </div>
              <div style={{ ...st.topologyRow, borderTopColor: '#4cc9f0' }}>
                <div style={st.topoLayer}>FastAPI 业务层</div>
                <div style={st.topoNote}>JWT · APScheduler · WeasyPrint</div>
              </div>
              <div style={{ ...st.topologyRow, borderTopColor: '#2ecc71' }}>
                <div style={st.topoLayer}>PostgreSQL 配置库</div>
                <div style={st.topoNote}>用户 · 主数据 · 快照 · 审计</div>
              </div>
              <div style={{ ...st.topologyRow, borderTopColor: '#e67e22' }}>
                <div style={st.topoLayer}>TDengine 时序库</div>
                <div style={st.topoNote}>PV · SP · OP · MODE</div>
              </div>
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
      <div style={{ ...st.metricValue, ...(tone === 'warn' ? { color: 'var(--amber-strong)' } : tone === 'ok' ? { color: 'var(--green-strong)' } : null) }}>{value}</div>
      <div style={st.metricDetail}>{detail}</div>
    </div>
  );
}

function InlineError({ text, onRetry }) {
  return (
    <div style={st.errBanner}>
      <div style={st.errText}>{text}</div>
      <button onClick={onRetry} style={st.errBtn}>重试</button>
    </div>
  );
}

function roleLabel(role) {
  return role === 'admin' ? '管理员' : role === 'engineer' ? '工程师' : '查看者';
}

const st = {
  page: { display: 'flex', flexDirection: 'column', gap: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--panel-shadow)' },
  metricLabel: { fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 },
  metricValue: { fontSize: 30, fontWeight: 800, color: 'var(--text-strong)' },
  metricDetail: { marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' },
  banner: (tone) => ({ padding: '12px 14px', borderRadius: 14, border: `1px solid ${tone === 'warn' ? '#fcd34d' : '#86efac'}`, background: tone === 'warn' ? '#fffbeb' : '#f0fdf4', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, auto)) 1fr', gap: 12, color: 'var(--text-muted)', fontSize: 12, alignItems: 'center' }),
  bannerDetail: { minWidth: 0 },
  contentGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 320px', gap: 16 },
  mainColumn: { display: 'grid', gap: 16 },
  sideColumn: { display: 'grid', gap: 16 },
  panel: { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--panel-shadow)', overflow: 'hidden' },
  panelHeader: { padding: '16px 18px 0' },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' },
  panelSub: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)' },
  optionBody: { padding: 18, display: 'grid', gap: 12 },
  optionCard: { border: '1px solid', borderRadius: 14, padding: 14, textAlign: 'left', width: '100%' },
  optionName: { fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' },
  optionDesc: { marginTop: 6, fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.6 },
  optionActive: { marginTop: 10, fontSize: 11, fontWeight: 700, color: 'var(--accent)' },
  validateBtn: { height: 42, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--text-subtle)', fontWeight: 600 },
  featureBody: { padding: 18, display: 'grid', gap: 4 },
  featureRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 12, background: '#fff' },
  featureName: { fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' },
  featureKey: { marginTop: 4, fontSize: 12, color: 'var(--text-subtle)' },
  toggle: (on) => ({ width: 48, height: 28, borderRadius: 14, border: 'none', background: on ? 'var(--green)' : '#d0d5dd', padding: 3, position: 'relative', transition: 'background 0.18s' }),
  toggleKnob: (on) => ({ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 18px', color: 'var(--text-subtle)', fontWeight: 700, background: 'var(--panel-muted)', borderBottom: '1px solid var(--line)' },
  row: { borderBottom: '1px solid #edf2f7' },
  td: { padding: '11px 18px', color: 'var(--text-subtle)' },
  tdStrong: { padding: '11px 18px', color: 'var(--text-strong)', fontWeight: 600 },
  state: { padding: 18, color: 'var(--text-subtle)' },
  errBanner: { margin: '12px 18px 0', padding: '12px 14px', borderRadius: 12, border: '1px solid #fca5a5', background: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  errText: { color: 'var(--text-subtle)', fontSize: 13 },
  errBtn: { padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 },
  textBody: { padding: 18, display: 'grid', gap: 10, color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.8 },
  topologyRow: { padding: '12px 0', borderTop: '3px solid', borderRadius: 10, marginBottom: 4 },
  topoLayer: { fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' },
  topoNote: { marginTop: 4, fontSize: 12, color: 'var(--text-subtle)' },
};
