import { useState } from 'react';

const GRADES = ['优','良','中','差','开环'];
const CSS = ['hmA','hmB','hmC','hmD','hmE'];

export default function Heatmap({ data, onCellClick }) {
  const [tip, setTip] = useState(null);

  return (
    <div style={{position:'relative'}}>
      <table style={{width:'100%',fontSize:'var(--font-sm)',borderCollapse:'separate',borderSpacing:2}}>
        <thead><tr><th style={{textAlign:'left',padding:'4px 8px',color:'var(--text-dim)',fontWeight:500}}>装置</th>{GRADES.map(g=><th key={g} style={{textAlign:'center',padding:'4px 2px',color:'var(--text-dim)',fontWeight:500}}>{g}</th>)}</tr></thead>
        <tbody>
          {Object.entries(data).map(([unit,vals])=>{
            const total = vals.reduce((a,b)=>a+b,0);
            return <tr key={unit}>
              <td style={{padding:'4px 8px',color:'var(--text-dim)'}}>{unit}</td>
              {vals.map((v,i)=>(
                <td key={i}><button
                  type="button"
                  className={CSS[i]}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',padding:'6px 4px',borderRadius:4,cursor:v > 0 ? 'pointer' : 'default',fontSize:'var(--font-sm)',fontWeight:600,
                    background:i===0?'rgba(46,204,113,0.25)':i===1?'rgba(52,152,219,0.25)':i===2?'rgba(241,196,15,0.2)':i===3?'rgba(231,76,60,0.25)':'rgba(127,140,141,0.15)',
                    color:i===0?'var(--green)':i===1?'var(--blue)':i===2?'var(--yellow)':i===3?'var(--red)':'var(--gray)', border:'none'}}
                  onMouseEnter={e=>setTip({x:e.clientX+12,y:e.clientY-40,unit,grade:GRADES[i],count:v,pct:total > 0 ? (v/total*100).toFixed(1) : '0.0'})}
                  onMouseMove={e=>setTip(t=>({...t,x:e.clientX+12,y:e.clientY-40}))}
                  onMouseLeave={()=>setTip(null)}
                  onClick={() => v > 0 && onCellClick?.(unit, GRADES[i])}
                  disabled={v === 0}
                >{v}</button></td>
              ))}
            </tr>;
          })}
        </tbody>
      </table>
      {tip && <div style={{position:'fixed',pointerEvents:'none',zIndex:1000,background:'#1a2d3d',border:'1px solid var(--border)',borderRadius:6,padding:'10px 14px',fontSize:'var(--font-sm)',color:'var(--text)',left:tip.x,top:tip.y}}>
        <strong>{tip.unit}</strong><br/>{tip.grade}评回路: {tip.count} 个 ({tip.pct}%)
      </div>}
    </div>
  );
}
