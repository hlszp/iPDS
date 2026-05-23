import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';

const UNITS = ['全厂概览','气化','变换及热回收','低温甲醇洗','液氮洗','氨合成','PSA 制氢','CO 分离及压缩','硫回收制酸','冷冻站','甲醇装置','醋酸装置'];

export default function Layout({ user, onLogout, children }) {
  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span className={styles.dot} />PDS 驾驶舱</div>
        <nav className={styles.tree}>
          {UNITS.map(u => (
            <NavLink key={u} to="/" className={({isActive}) => `${styles.item} ${isActive ? styles.active : ''}`}>
              <span>{u}</span>
              <span className={styles.badge}>{u==='全厂概览'?1200:u.length*8}</span>
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
