import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { FilterBar, FilterGroup, MetricCard, Panel, RetryAction, StateBlock, StatusBanner } from '../../components/ui';

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
  const enabledCount = features.filter((feature) => feature.enabled).length;
  const runtimeTone = runtimeSource?.degraded ? 'warn' : 'ok';

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
      setRuntimeSource(null);
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
      setUsers([]);
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
      setFeatures((prev) => prev.map((feature) => feature.key === key ? { ...feature, enabled: !enabled } : feature));
    } catch (e) {
      setFeatureError(e.message || '功能开关更新失败');
    }
  };

  const changeRuntimeSource = async (source) => {
    try {
      const next = await api.updateRuntimeSource(source);
      setRuntimeSource(next);
      setRuntimeError('');
    } catch (e) {
      setRuntimeError(e.message || '运行数据源切换失败');
    }
  };

  const validateRuntimeSource = async () => {
    try {
      const next = await api.validateRuntimeSource();
      setRuntimeSource(next);
      setRuntimeError('');
    } catch (e) {
      setRuntimeError(e.message || '运行数据源探测失败');
    }
  };

  return (
    <div className="ui-stack">
      <div className="ui-summary-grid">
        <MetricCard label="当前生效" value={runtimeSource?.effective_source || '—'} detail={`配置模式 ${runtimeSource?.configured_source || '—'}`} />
        <MetricCard label="回路覆盖" value={`${runtimeSource?.served_loop_count ?? 0}/${runtimeSource?.expected_loop_count ?? 0}`} detail={runtimeSource?.degraded ? `已降级 · ${runtimeSource?.fallback_reason || runtimeSource?.detail}` : '运行数据正常'} tone={runtimeSource?.degraded ? 'warn' : 'default'} />
        <MetricCard label="功能模块" value={`${enabledCount}/${features.length || 0}`} detail="已启用模块数量" />
        <MetricCard label="当前用户" value={user.display_name || user.username || '—'} detail={isAdmin ? '管理员' : user.role === 'engineer' ? '工程师' : '查看者'} />
      </div>

      <StatusBanner
        tone={runtimeError ? 'danger' : runtimeTone}
        items={[
          { label: '配置模式', value: runtimeSource?.configured_source || '—' },
          { label: '当前生效', value: runtimeSource?.effective_source || '—' },
          { label: '回路覆盖', value: `${runtimeSource?.served_loop_count ?? 0}/${runtimeSource?.expected_loop_count ?? 0}` },
        ]}
        detail={runtimeError || runtimeSource?.fallback_reason || runtimeSource?.detail || '尚未读取运行数据源状态。'}
        actions={runtimeError ? <RetryAction onClick={loadRuntimeSource}>重试读取</RetryAction> : null}
      />

      <div className="ui-page-section ui-page-section--sidebar">
        <div className="ui-stack">
          <Panel title="运行数据源" subtitle="配置数据源模式、验证可用性、查看降级与覆盖情况。">
            <div className="ui-stack">
              {RUNTIME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="ui-loop-item"
                  onClick={() => changeRuntimeSource(option.value)}
                  style={runtimeSource?.configured_source === option.value ? { borderColor: 'var(--accent)', background: 'rgba(20,184,166,.06)' } : undefined}
                >
                  <div>
                    <div className="ui-loop-item__title">{option.label}</div>
                    <div className="ui-loop-item__meta">{option.desc}</div>
                  </div>
                  <div className="ui-loop-item__meta">{runtimeSource?.configured_source === option.value ? '当前选择' : '点击切换'}</div>
                </button>
              ))}
              <FilterBar align="left">
                <FilterGroup>
                  <button type="button" className="ui-secondary-action" onClick={validateRuntimeSource}>探测真实数据源可用性</button>
                  <button type="button" className="ui-secondary-action" onClick={loadRuntimeSource}>刷新状态</button>
                </FilterGroup>
              </FilterBar>
            </div>
          </Panel>

          <Panel title="功能开关" subtitle="按模块启用或禁用平台能力。">
            {featureError ? (
              <StateBlock compact type="error" title="功能开关加载失败" detail={featureError} action={<RetryAction onClick={loadFeatures}>重试读取</RetryAction>} />
            ) : (
              <div className="ui-stack">
                {features.map((feature) => (
                  <div key={feature.key} className="ui-loop-item">
                    <div>
                      <div className="ui-loop-item__title">{FEATURE_LABELS[feature.key] || feature.key}</div>
                      <div className="ui-loop-item__meta">{feature.key}</div>
                    </div>
                    <button type="button" className={`ui-tab ${feature.enabled ? 'is-active' : ''}`} onClick={() => toggleFeature(feature.key, feature.enabled)}>
                      {feature.enabled ? '已启用' : '已停用'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {isAdmin ? (
            <Panel title="用户管理" subtitle="只读用户列表，便于管理员核对账号与权限。" padded={false}>
              <div className="ui-panel__body">
                {usersError ? (
                  <StateBlock compact type="error" title="用户列表加载失败" detail={usersError} action={<RetryAction onClick={loadUsers}>重试读取</RetryAction>} />
                ) : loadingUsers ? (
                  <StateBlock compact type="loading" title="正在加载用户列表" detail="正在同步账号与角色信息。" />
                ) : users.length === 0 ? (
                  <StateBlock compact type="empty" title="暂无用户数据" detail="当前没有可展示的账号信息。" />
                ) : (
                  <div className="ui-table-wrap">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>用户名</th>
                          <th>显示名</th>
                          <th>角色</th>
                          <th>创建时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((item) => (
                          <tr key={item.username}>
                            <td>{item.username}</td>
                            <td>{item.display_name || '—'}</td>
                            <td>{roleLabel(item.role)}</td>
                            <td>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="ui-stack">
          <Panel title="使用说明" subtitle="当前页面的真实控制面语义。">
            <div className="ui-text-block">
              <p>运行数据源的切换直接影响 Overview、Monitoring、Assessment 的数据来源与可信提示。</p>
              <p>功能开关按模块控制整个平台的可见性与可用状态；关闭模块不会删除已有数据。</p>
              <p>用户管理当前提供只读视图；后续再补齐新增、编辑、删除和角色变更能力。</p>
            </div>
          </Panel>

          <Panel title="部署拓扑" subtitle="FastAPI + PostgreSQL + TDengine + React。">
            <div className="ui-stack">
              <div className="ui-callout"><strong>React 前端</strong><div className="ui-text-block"><p>Nginx → :5173</p></div></div>
              <div className="ui-callout"><strong>FastAPI 业务层</strong><div className="ui-text-block"><p>JWT · APScheduler · WeasyPrint</p></div></div>
              <div className="ui-callout"><strong>PostgreSQL 配置库</strong><div className="ui-text-block"><p>用户 · 主数据 · 快照 · 审计</p></div></div>
              <div className="ui-callout"><strong>TDengine 时序库</strong><div className="ui-text-block"><p>PV · SP · OP · MODE</p></div></div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function roleLabel(role) {
  return role === 'admin' ? '管理员' : role === 'engineer' ? '工程师' : '查看者';
}
