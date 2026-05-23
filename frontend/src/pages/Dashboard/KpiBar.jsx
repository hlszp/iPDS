import styles from './Dashboard.module.css';

export default function KpiBar({ autoRate, stabilityRate, problems }) {
  const ok = parseFloat(autoRate) >= 95;
  return (
    <div className={styles.kpiBar}>
      <div className={`${styles.kpiCard} ${styles.good}`}>
        <div className={styles.kpiLabel}>全厂自控率</div>
        <div className={styles.kpiValue}>{autoRate}%</div>
        <div className={styles.kpiTarget}>目标 ≥ 95% {ok ? '✓' : '!'}</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>控制平稳率</div>
        <div className={styles.kpiValue}>{stabilityRate}%</div>
        <div className={styles.kpiTarget}>较上周 +0.5%</div>
      </div>
      <div className={`${styles.kpiCard} ${styles.warn}`}>
        <div className={styles.kpiLabel}>问题回路</div>
        <div className={styles.kpiValue}>{problems}</div>
        <div className={styles.kpiTarget}>评级「差」+「开环」</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>今日报警次数</div>
        <div className={styles.kpiValue}>1,247</div>
        <div className={styles.kpiTarget}>较昨日 −142</div>
      </div>
    </div>
  );
}
