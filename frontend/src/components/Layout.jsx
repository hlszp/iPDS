import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBanner } from './ui';
import styles from './Layout.module.css';

const NAV_GROUPS = [
  {
    title: '运行总览',
    items: [
      { key: 'overview', label: '全景驾驶舱', path: '/', icon: '01' },
      { key: 'monitoring', label: '实时监控', path: '/monitoring', icon: '02' },
      { key: 'assessment', label: '性能评估', path: '/assessment', icon: '03' },
    ],
  },
  {
    title: '优化执行',
    items: [
      { key: 'tuning', label: '整定工作台', path: '/tuning', icon: '04' },
      { key: 'identification', label: '系统辨识', path: '/identification', icon: '05' },
      { key: 'simulation', label: '闭环仿真', path: '/simulation', icon: '06' },
      { key: 'reports', label: '报告中心', path: '/reports', icon: '07' },
      { key: 'commissioning', label: '投运准备', path: '/commissioning', icon: '08' },
    ],
  },
  {
    title: '治理与配置',
    items: [
      { key: 'config', label: '回路建模', path: '/config', icon: '09' },
      { key: 'scheduler', label: '调度与审计', path: '/scheduler', icon: '10' },
      { key: 'settings', label: '系统设置', path: '/settings', icon: '11' },
    ],
  },
];

const PAGE_META = [
  { match: /^\/$/, kicker: 'PDS / 运行总览', title: '全景驾驶舱', subtitle: '面向客户交付的正式产品视图，集中展示回路健康、数据可信状态与关键问题。' },
  { match: /^\/monitoring/, kicker: 'PDS / 运行总览', title: '实时监控', subtitle: '查看实时趋势、运行快照与历史统计，确认数据覆盖与降级状态。' },
  { match: /^\/assessment\/.+/, kicker: 'PDS / 监测分析', title: '评估详情', subtitle: '围绕单回路评估结果展开诊断证据、建议与整定入口。' },
  { match: /^\/assessment/, kicker: 'PDS / 监测分析', title: '性能评估', subtitle: '基于 GB/T 44693.2-2024 指标体系定位问题回路与优先级。' },
  { match: /^\/loop\/.+\/tuning/, kicker: 'PDS / 优化执行', title: 'PID 整定工作台', subtitle: '结合回路识别与评估结果生成参数建议，并比较优化前后效果。' },
  { match: /^\/loop\/.+/, kicker: 'PDS / 监测分析', title: '回路详情', subtitle: '查看单回路运行趋势、诊断特征、评估指标与操作建议。' },
  { match: /^\/tuning/, kicker: 'PDS / 优化执行', title: '整定工作台', subtitle: '集中选择待优化回路并进入参数整定工作流。' },
  { match: /^\/reports/, kicker: 'PDS / 优化执行', title: '报告中心', subtitle: '生成单回路与批量报告，并验证报表产出格式与交付状态。' },
  { match: /^\/commissioning/, kicker: 'PDS / 优化执行', title: '投运准备', subtitle: '校验回路清单、配置完整性与批量投运准备情况。' },
  { match: /^\/identification/, kicker: 'PDS / 优化执行', title: '系统辨识', subtitle: '从历史扰动窗口提取 FOPDT / ARX / 子空间模型，为整定与仿真提供模型候选。' },
  { match: /^\/simulation/, kicker: 'PDS / 优化执行', title: '闭环仿真', subtitle: '对整定方案进行阶跃、扰动与粘滞场景仿真，对比方案效果与风险。' },
  { match: /^\/scheduler/, kicker: 'PDS / 治理与配置', title: '调度与审计', subtitle: '查看定时评估、报表作业与操作审计事件，确认平台运行状态。' },
  { match: /^\/config/, kicker: 'PDS / 治理与配置', title: '回路建模', subtitle: '维护装置、设备、回路组与回路配置，作为各分析模块的统一基础。' },
  { match: /^\/settings/, kicker: 'PDS / 治理与配置', title: '系统设置', subtitle: '查看数据源状态、功能开关与平台级配置。' },
];

const COLLAPSED = {};

function getPageMeta(pathname) {
  return PAGE_META.find((item) => item.match.test(pathname)) || {
    kicker: 'PDS',
    title: '控制回路性能评估系统',
    subtitle: '正式产品环境',
  };
}

function getRuntimeTone(runtime) {
  if (!runtime) return 'neutral';
  return runtime.degraded ? 'warn' : 'ok';
}

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [treeData, setTreeData] = useState([]);
  const [expanded, setExpanded] = useState(COLLAPSED);
  const [runtimeSource, setRuntimeSource] = useState(null);
  const [features, setFeatures] = useState([]);
  const page = useMemo(() => getPageMeta(location.pathname), [location.pathname]);

  useEffect(() => {
    api.getPlantTree()
      .then((data) => setTreeData(data.plants || []))
      .catch(() => setTreeData([]));

    api.getRuntimeSource()
      .then(setRuntimeSource)
      .catch(() => setRuntimeSource(null));

    api.listFeatures()
      .then((items) => setFeatures(items || []))
      .catch(() => setFeatures([]));
  }, []);

  const enabledFeatures = features.filter((item) => item.enabled).length;
  const runtimeTone = getRuntimeTone(runtimeSource);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>PDS</div>
          <div>
            <div className={styles.brandTitle}>控制回路性能评估</div>
            <div className={styles.brandSub}>PID Assessment & Tuning</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>装置回路树</div>
            <div className={styles.tree}>
              {treeData.map((plant) => (
                <div key={`p-${plant.id}`} className={styles.treeUnit}>
                  <div className={styles.treeUnitName} onClick={() => toggle(`p-${plant.id}`)}>
                    <span className={styles.treeCaret}>{expanded[`p-${plant.id}`] ? '▼' : '▶'}</span>
                    {plant.name}
                  </div>
                  {(expanded[`p-${plant.id}`] || treeData.length <= 1) && plant.devices.map((device) => (
                    <div key={`d-${device.id}`} className={styles.treeGroup}>
                      <div className={styles.treeGroupName} onClick={() => toggle(`d-${device.id}`)}>
                        <span className={styles.treeCaret}>{expanded[`d-${device.id}`] ? '▼' : '▶'}</span>
                        {device.name}
                      </div>
                      {(expanded[`d-${device.id}`] || plant.devices.length <= 1) && device.loop_groups.map((grp) => (
                        <div key={`g-${grp.id}`} className={styles.treeSubGroup}>
                          <div className={styles.treeSubGroupName} onClick={() => toggle(`g-${grp.id}`)}>
                            <span className={styles.treeCaret}>{expanded[`g-${grp.id}`] ? '▼' : '▶'}</span>
                            {grp.name}
                          </div>
                          {(expanded[`g-${grp.id}`] || device.loop_groups.length <= 1) && grp.loops.map((loop) => (
                            <NavLink
                              key={loop.tag_name}
                              to={`/loop/${loop.tag_name}`}
                              className={({ isActive }) => `${styles.treeLoop} ${isActive ? styles.treeLoopActive : ''}`}
                            >
                              {loop.tag_name}
                            </NavLink>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {treeData.length === 0 && <div className={styles.treeEmpty}>暂无数据</div>}
            </div>
          </div>
        </nav>

        <div className={styles.footer}>
          <span className={styles.avatar}>{user?.display_name?.[0] || user?.username?.[0] || '?'}</span>
          <div className={styles.userBlock}>
            <div className={styles.userName}>{user?.display_name || user?.username}</div>
            <div className={styles.userMeta}>{user?.role === 'admin' ? '管理员' : user?.role === 'engineer' ? '工程师' : '查看者'}</div>
          </div>
          <button onClick={onLogout} className={styles.logout}>退出</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageIntro}>
            <div className={styles.pageKicker}>{page.kicker}</div>
            <h1 className={styles.pageTitle}>{page.title}</h1>
            <p className={styles.pageSubtitle}>{page.subtitle}</p>
          </div>
          <div className={styles.topActions}>
            <div className={`${styles.trustPill} ${styles[runtimeTone]}`}>
              <span className={styles.trustDot} />
              <span>{runtimeSource?.degraded ? '已降级运行' : '运行数据正常'}</span>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>当前生效</div>
              <div className={styles.metaValue}>{runtimeSource?.effective_source || '—'}</div>
              <div className={styles.metaDetail}>
                {runtimeSource?.served_loop_count ?? 0}/{runtimeSource?.expected_loop_count ?? 0} 回路
              </div>
            </div>
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>功能模块</div>
              <div className={styles.metaValue}>{enabledFeatures}/{features.length || 0}</div>
              <div className={styles.metaDetail}>已启用能力</div>
            </div>
          </div>
        </header>

        <section className={styles.runtimeBar}>
          <StatusBanner
            tone={runtimeTone}
            items={[
              { label: '配置模式', value: runtimeSource?.configured_source || '—' },
              { label: '当前生效', value: runtimeSource?.effective_source || '—' },
              { label: '回路覆盖', value: `${runtimeSource?.served_loop_count ?? 0}/${runtimeSource?.expected_loop_count ?? 0}` },
            ]}
            detail={runtimeSource?.fallback_reason || runtimeSource?.detail || '尚未读取运行数据源状态'}
          />
        </section>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
