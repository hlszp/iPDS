import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiBar from './KpiBar';
import Heatmap from './Heatmap';
import Top10Table from './Top10Table';
import TrendChart from './TrendChart';
import EventTimeline from './EventTimeline';
import styles from './Dashboard.module.css';

const HEATMAP_DATA = {
  '气化':[42,28,12,3,1],'变换及热回收':[38,22,9,2,1],'低温甲醇洗':[58,35,12,4,1],
  '液氮洗':[28,12,4,1,0],'氨合成':[52,30,11,3,2],'PSA 制氢':[48,40,22,8,2],
  '甲醇装置':[62,48,30,12,4],'醋酸装置':[50,28,10,3,1],'硫回收制酸':[30,15,6,2,0],
  '冷冻站':[24,12,4,1,0],'CO 分离及压缩':[36,20,8,2,1]
};

const TOP10 = [
  {tag:'FIC-10023',unit:'甲醇装置',grade:'D',faults:[{t:'阀门粘滞',c:'stiction'}],w:7},
  {tag:'PIC-20015',unit:'PSA 制氢',grade:'D',faults:[{t:'持续振荡',c:'osc'}],w:6},
  {tag:'LIC-30042',unit:'氨合成',grade:'D',faults:[{t:'阀门粘滞',c:'stiction'},{t:'振荡',c:'osc'}],w:8},
  {tag:'TIC-40008',unit:'低温甲醇洗',grade:'C',faults:[{t:'耦合振荡',c:'osc'}],w:5},
  {tag:'FIC-50011',unit:'气化',grade:'C',faults:[],w:4},
  {tag:'PIC-60033',unit:'甲醇装置',grade:'C',faults:[{t:'过程扰动',c:'stiction'}],w:5},
  {tag:'LIC-70019',unit:'PSA 制氢',grade:'C',faults:[],w:3},
  {tag:'TIC-80002',unit:'氨合成',grade:'D',faults:[{t:'阀门粘滞',c:'stiction'}],w:8}
];

const EVENTS = [
  {time:'14:32',type:'warn',title:'FIC-10023 连续7天评分下降',meta:'建议：检查阀门是否粘滞'},
  {time:'11:15',type:'ok',title:'PIC-20015 完成PID整定',meta:'工程师：李工 | P=2.3 I=0.45'},
  {time:'09:00',type:'info',title:'全厂日评估报告已生成',meta:''},
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);

  if (loading) return <Skeleton />;

  let a=0,b=0,c=0,d=0,e=0;
  Object.values(HEATMAP_DATA).forEach(v=>{a+=v[0];b+=v[1];c+=v[2];d+=v[3];e+=v[4];});
  const t=a+b+c+d+e;
  const autoRate = ((a+b+c)/t*100).toFixed(1);
  const stabilityRate = ((a+b)/t*100).toFixed(1);

  return (
    <>
      <KpiBar autoRate={autoRate} stabilityRate={stabilityRate} problems={d+e} />
      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.phead}><span>装置回路健康总览</span><span className={styles.pact}>周报 ▾</span></div>
          <div className={styles.pbody}><Heatmap data={HEATMAP_DATA} /></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.phead}><span>Top 10 问题回路</span><span className={styles.pact}>查看全部 →</span></div>
          <div className={styles.pbody} style={{padding:0}}><Top10Table data={TOP10} onRowClick={t => nav(`/loop/${t.tag}`)} /></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.phead}><span>自控率趋势（近30天）</span><span className={styles.pact}>装置对比 ▾</span></div>
          <div className={styles.pbody} style={{padding:'8px 12px'}}><TrendChart /></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.phead}><span>最近告警与操作</span><span className={styles.pact}>全部 →</span></div>
          <div className={styles.pbody}><EventTimeline events={EVENTS} /></div>
        </div>
      </div>
      <div className={styles.sbar}>
        <span><span className={`${styles.sdot} ${styles.ok}`} />数据更新: {new Date().toLocaleString('zh-CN')}</span>
        <span><span className={`${styles.sdot} ${styles.ok}`} />评估引擎: 运行中</span>
        <span>下一批次: 明天 06:00</span>
      </div>
    </>
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
