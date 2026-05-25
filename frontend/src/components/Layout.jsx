import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api/client';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { key: 'overview', label: '总览', path: '/', icon: '◫' },
  { key: 'monitoring', label: '监控', path: '/monitoring', icon: '◉' },
  { key: 'assessment', label: '评估', path: '/assessment', icon: '▤' },
  { key: 'reports', label: '报表', path: '/reports', icon: '▣' },
  { key: 'config', label: '配置', path: '/config', icon: '⚙' },
];

const COLLAPSED = {};

export default function Layout({ user, onLogout, children }) {
  const [treeData, setTreeData] = useState([]);
  const [expanded, setExpanded] = useState(COLLAPSED);

  useEffect(() => {
    api.getPlantTree()
      .then((data) => setTreeData(data.plants || []))
      .catch(() => setTreeData([]));
  }, []);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span className={styles.dot} />PDS 控制回路性能评估</div>
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.key} to={item.path} end={item.path === '/'}
                className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
                <span className={styles.icon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>回路树</div>
            <div className={styles.tree}>
              {treeData.map((plant) => (
                <div key={`p-${plant.id}`} className={styles.treeUnit}>
                  <div className={styles.treeUnitName}
                    onClick={() => toggle(`p-${plant.id}`)}>
                    <span className={styles.treeCaret}>{expanded[`p-${plant.id}`] ? '▼' : '▶'}</span>
                    {plant.name}
                  </div>
                  {(expanded[`p-${plant.id}`] || treeData.length <= 1) && plant.devices.map((device) => (
                    <div key={`d-${device.id}`} className={styles.treeGroup}>
                      <div className={styles.treeGroupName}
                        onClick={() => toggle(`d-${device.id}`)}>
                        <span className={styles.treeCaret}>{expanded[`d-${device.id}`] ? '▼' : '▶'}</span>
                        {device.name}
                      </div>
                      {(expanded[`d-${device.id}`] || plant.devices.length <= 1) && device.loop_groups.map((grp) => (
                        <div key={`g-${grp.id}`} className={styles.treeSubGroup}>
                          <div className={styles.treeSubGroupName}
                            onClick={() => toggle(`g-${grp.id}`)}>
                            <span className={styles.treeCaret}>{expanded[`g-${grp.id}`] ? '▼' : '▶'}</span>
                            {grp.name}
                          </div>
                          {(expanded[`g-${grp.id}`] || device.loop_groups.length <= 1) && grp.loops.map((loop) => (
                            <NavLink key={loop.tag_name} to={`/loop/${loop.tag_name}`}
                              className={({ isActive }) => `${styles.treeLoop} ${isActive ? styles.treeLoopActive : ''}`}>
                              {loop.tag_name}
                            </NavLink>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {treeData.length === 0 && (
                <div className={styles.treeLoop} style={{ color: 'var(--text-dim)', padding: '8px 0', cursor: 'default' }}>
                  暂无数据
                </div>
              )}
            </div>
          </div>
        </nav>
        <div className={styles.footer}>
          <span className={styles.avatar}>{user?.display_name?.[0] || '?'}</span>
          <span>{user?.display_name || user?.username}</span>
          <button onClick={onLogout} className={styles.logout}>退出</button>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </>
  );
}
