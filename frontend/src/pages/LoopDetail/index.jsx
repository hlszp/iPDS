import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function LoopDetail() {
  const { tagName } = useParams();
  const nav = useNavigate();

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
        <button onClick={()=>nav('/')} style={{background:'none',border:'1px solid var(--border)',color: 'var(--text-dim)',padding:'4px 12px',borderRadius:4,fontSize:'var(--font-sm)'}}>← 返回驾驶舱</button>
        <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>{tagName}</h2>
        <span style={{color:'var(--text-dim)'}}>甲醇装置 · 流量控制</span>
        <button onClick={()=>nav(`/loop/${tagName}/tuning`)} style={{marginLeft:'auto',padding:'8px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)'}}>PID 整定</button>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'auto 1fr',gap:12,padding:12,overflow:'auto'}}>
        <KpiCards tag={tagName} />
        <DiagnosisCard tag={tagName} />
        <TrendPanel tag={tagName} />
        <InfoPanel tag={tagName} />
      </div>
    </div>
  );
}

function KpiCards({ tag }) {
  return (
    <div style={{display:'flex',gap:12}}>
      {[{l:'自控率',v:'98.5%',c:'var(--green)'},{l:'平稳率',v:'94.2%',c:'var(--green)'},{l:'性能评分',v:'82.3',c:'var(--accent)'},{l:'评级',v:'良',c:'var(--blue)'}].map(k=>(
        <div key={k.l} style={{flex:1,background:'var(--surface)',borderRadius:6,padding:'14px 18px'}}>
          <div style={{fontSize:'var(--font-sm)',color:'var(--text-dim)',marginBottom:4}}>{k.l}</div>
          <div style={{fontSize:28,fontWeight:700,color:k.c}}>{k.v}</div>
        </div>
      ))}
    </div>
  );
}

function DiagnosisCard({ tag }) {
  return (
    <div style={{background:'var(--surface)',borderRadius:6,padding:16}}>
      <h3 style={{color:'#fff',fontSize:'var(--font-md)',marginBottom:12}}>故障诊断</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:'var(--font-sm)'}}>
        {[{l:'阀门粘滞',v:'未检测',c:'var(--green)'},{l:'振荡',v:'未检测',c:'var(--green)'},{l:'非线性度',v:'0.03',c:'var(--green)'},{l:'回路耦合',v:'无',c:'var(--green)'}].map(d=>(
          <div key={d.l} style={{display:'flex',justifyContent:'space-between',padding:'6px 8px',background:'rgba(255,255,255,0.02)',borderRadius:4}}>
            <span style={{color:'var(--text-dim)'}}>{d.l}</span>
            <span style={{color:d.c,fontWeight:600}}>{d.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendPanel({ tag }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });
    const base = tag === 'FIC-10023' ? 50 : 60;
    const pv = Array.from({length:200},(_,i)=>base+Math.sin(i/30)*3+Math.random()*1.5);
    const sp = Array.from({length:200},(_,i)=>base+(i>50?2:i>120?-1:0));
    const op = Array.from({length:200},()=>40+Math.random()*20);
    chart.setOption({
      backgroundColor:'transparent',
      grid:{top:10,right:60,bottom:30,left:50},
      xAxis:{type:'category',data:Array.from({length:200},(_,i)=>`${(i/60).toFixed(0)}:${String(i%60).padStart(2,'0')}`).filter((_,i)=>i%20===0),axisLine:{lineStyle:{color:'#253545'}},axisLabel:{color:'#708090',fontSize:10}},
      yAxis:[{type:'value',axisLine:{lineStyle:{color:'#253545'}},axisLabel:{color:'#708090',fontSize:10},splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}}},{type:'value',min:0,max:100,axisLine:{lineStyle:{color:'#253545'}},axisLabel:{color:'#708090',fontSize:10}}],
      series:[
        {name:'PV',type:'line',data:pv,smooth:!0,lineStyle:{color:'#3498db',width:2},symbol:'none'},
        {name:'SP',type:'line',data:sp,smooth:!0,lineStyle:{color:'#f0a030',width:2,type:'dashed'},symbol:'none'},
        {name:'OP',type:'line',yAxisIndex:1,data:op,smooth:!0,lineStyle:{color:'#2ecc71',width:1.5},symbol:'none'},
      ],
      legend:{top:5,right:0,textStyle:{color:'#d0d8e0',fontSize:11}},
    });
    return ()=>chart.dispose();
  }, [tag]);

  return (
    <div style={{background:'var(--surface)',borderRadius:6,display:'flex',flexDirection:'column'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',color:'#fff',fontWeight:600,fontSize:'var(--font-md)'}}>趋势图（近3小时）</div>
      <div ref={ref} style={{flex:1,minHeight:200}} />
    </div>
  );
}

function InfoPanel({ tag }) {
  return (
    <div style={{background:'var(--surface)',borderRadius:6,padding:16}}>
      <h3 style={{color:'#fff',fontSize:'var(--font-md)',marginBottom:12}}>回路信息</h3>
      <div style={{fontSize:'var(--font-sm)',color:'var(--text-dim)',lineHeight:2}}>
        <div>位号: <span style={{color:'var(--text)'}}>{tag}</span></div>
        <div>装置: <span style={{color:'var(--text)'}}>甲醇装置</span></div>
        <div>描述: <span style={{color:'var(--text)'}}>甲醇进料流量控制</span></div>
        <div>PV位号: FIC10023.PV &nbsp;|&nbsp; SP位号: FIC10023.SP &nbsp;|&nbsp; OP位号: FIC10023.OP</div>
        <div>量程: 0–100 t/h &nbsp;|&nbsp; 采样周期: 1s &nbsp;|&nbsp; 死区时间: ~3s</div>
      </div>
    </div>
  );
}
