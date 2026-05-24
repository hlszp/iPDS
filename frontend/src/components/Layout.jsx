import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { key: 'dashboard', label: '驾驶舱', path: '/', icon: '◫' },
  { key: 'config', label: '回路管理', path: '/config', icon: '☰' },
  { key: 'tuning', label: '整定工作台', path: '/tuning', icon: '⚙' },
  { key: 'reports', label: '评估报告', path: '/reports', icon: '▤' },
  { key: 'commissioning', label: '投运管理', path: '/commissioning', icon: '⇧' },
  { key: 'settings', label: '系统设置', path: '/settings', icon: '◉' },
];

export default function Layout({ user, onLogout, children }) {
  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span className={styles.dot} />PDS 驾驶舱</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.key} to={item.path} end={item.path === '/'}
              className={({isActive}) => `${styles.item} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
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
