import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

export default function TuningWorkspace() {
  const { tagName } = useParams();
  const nav = useNavigate();
  const [method, setMethod] = useState('imc');
  const [result, setResult] = useState(null);
  const chartRef = useRef(null);

  const runTuning = () => {
    const params = {
      imc: { Kc: 0.423, Ti: 18.0, Td: 1.2, method: 'IMC' },
      lambda: { Kc: 0.315, Ti: 12.0, Td: 0, method: 'Lambda' },
      aggressive: { Kc: 0.678, Ti: 12.0, Td: 1.8, method: 'IMC-Aggressive' },
    }[method];
    setResult(params);
    setTimeout(() => drawSimulation(params), 100);
  };

  const drawSimulation = (params) => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const t = Array.from({length:200},(_,i)=>i*0.5);
    const sp = t.map(v=>v<5?0:10);
    const pv = t.map(v=>v<5?0:10*(1-Math.exp(-(v-5)/(params.Ti*0.3)))*(1+params.Kc*0.1*Math.sin(v/3)*Math.exp(-v/20)));
    chart.setOption({
      backgroundColor:'transparent', grid:{top:10,right:20,bottom:30,left:45},
      xAxis:{type:'category',data:t.filter((_,i)=>i%20===0).map(v=>`${v.toFixed(0)}s`),axisLine:{lineStyle:{color:'#253545'}},axisLabel:{color:'#708090',fontSize:10}},
      yAxis:{type:'value',axisLine:{lineStyle:{color:'#253545'}},axisLabel:{color:'#708090',fontSize:10},splitLine:{lineStyle:{color:'rgba(255,255,255,0.05)'}}},
      series:[
        {name:'SP',type:'line',data:sp,smooth:!0,lineStyle:{color:'#f0a030',width:2,type:'dashed'},symbol:'none'},
        {name:'PV(仿真)',type:'line',data:pv,smooth:!0,lineStyle:{color:'#3498db',width:2},symbol:'none'},
      ],
      legend:{top:5,right:0,textStyle:{color:'#d0d8e0',fontSize:11}},
    });
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
        <button onClick={()=>nav(`/loop/${tagName}`)} style={{background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',padding:'4px 12px',borderRadius:4,fontSize:'var(--font-sm)'}}>← 返回详情</button>
        <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>{tagName} · PID 整定工作台</h2>
      </div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:'300px 1fr',gap:12,padding:12,overflow:'auto'}}>
        <div style={{background:'var(--surface)',borderRadius:6,padding:16,display:'flex',flexDirection:'column',gap:12}}>
          <h3 style={{color:'#fff',fontSize:'var(--font-md)'}}>整定方法</h3>
          {[{k:'imc',l:'IMC 标准整定'},{k:'lambda',l:'Lambda 保守整定'},{k:'aggressive',l:'IMC 激进整定'}].map(m=>(
            <label key={m.k} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'8px 12px',borderRadius:4,background:method===m.k?'rgba(240,160,48,0.1)':'rgba(255,255,255,0.02)',border:method===m.k?'1px solid var(--accent)':'1px solid transparent'}}>
              <input type="radio" name="method" checked={method===m.k} onChange={()=>setMethod(m.k)} />
              <span style={{fontSize:'var(--font-md)'}}>{m.l}</span>
            </label>
          ))}
          <button onClick={runTuning} style={{marginTop:8,padding:'10px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)'}}>计算 PID 参数</button>
          {result && (
            <div style={{marginTop:12,padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
              <div style={{color:'var(--text-dim)'}}>整定结果 ({result.method})</div>
              <div style={{color:'#fff',fontSize:'var(--font-lg)',fontWeight:700}}>Kc = {result.Kc}</div>
              <div>Ti = {result.Ti}s &nbsp;|&nbsp; Td = {result.Td}s</div>
              <div style={{marginTop:8,color:'var(--accent)'}}>置信度: 78% (medium)</div>
              <div style={{color:'var(--text-dim)',marginTop:4,fontSize:'var(--font-sm)'}}>建议在DCS中手动输入参数后观察实际响应</div>
            </div>
          )}
        </div>
        <div style={{background:'var(--surface)',borderRadius:6,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',color:'#fff',fontWeight:600,fontSize:'var(--font-md)'}}>闭环仿真预览</div>
          <div ref={chartRef} style={{flex:1,minHeight:240}} />
        </div>
      </div>
    </div>
  );
}
