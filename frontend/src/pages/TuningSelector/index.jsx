import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function TuningSelector() {
  const [loops, setLoops] = useState([]);
  const [filter, setFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api.listLoops({ limit: 500 }).then(setLoops).catch(() => {});
  }, []);

  const units = [...new Set(loops.map(l => l.unit).filter(Boolean))];
  const filtered = loops.filter(l => {
    if (unitFilter && l.unit !== unitFilter) return false;
    if (filter && !l.tag_name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{padding:24,height:'100%',overflow:'auto'}}>
      <h2 style={{color:'#fff',fontSize:'var(--font-xl)',marginBottom:20}}>整定工作台</h2>
      <p style={{color:'var(--text-dim)',marginBottom:20,fontSize:'var(--font-sm)'}}>选择需要整定的控制回路，进入 PID 参数整定与仿真验证。</p>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="搜索位号..."
          style={{padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)',width:240}} />
        <select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)}
          style={{padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}}>
          <option value="">全部装置</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <table style={{width:'100%',fontSize:'var(--font-sm)',borderCollapse:'collapse'}}>
        <thead>
          <tr style={{borderBottom:'1px solid var(--border)'}}>
            <th style={{textAlign:'left',padding:'10px 8px',color:'var(--text-dim)',fontWeight:500}}>位号</th>
            <th style={{textAlign:'left',padding:'10px 8px',color:'var(--text-dim)',fontWeight:500}}>装置</th>
            <th style={{textAlign:'left',padding:'10px 8px',color:'var(--text-dim)',fontWeight:500}}>回路类型</th>
            <th style={{textAlign:'left',padding:'10px 8px',color:'var(--text-dim)',fontWeight:500}}>描述</th>
            <th style={{textAlign:'left',padding:'10px 8px',color:'var(--text-dim)',fontWeight:500}}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(l => (
            <tr key={l.tag_name} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer'}}
              onClick={() => nav(`/loop/${l.tag_name}/tuning`)}>
              <td style={{padding:'10px 8px',color:'#fff',fontWeight:600}}>{l.tag_name}</td>
              <td style={{padding:'10px 8px',color:'var(--text-dim)'}}>{l.unit}</td>
              <td style={{padding:'10px 8px',color:'var(--text-dim)'}}>{l.loop_type}</td>
              <td style={{padding:'10px 8px',color:'var(--text-dim)'}}>{l.description || '—'}</td>
              <td style={{padding:'10px 8px'}}>
                <button onClick={e=>{e.stopPropagation();nav(`/loop/${l.tag_name}/tuning`);}}
                  style={{padding:'4px 12px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontSize:'var(--font-sm)',cursor:'pointer'}}>
                  整定
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div style={{padding:40,textAlign:'center',color:'var(--text-dim)'}}>
          {loops.length === 0 ? '加载中...' : '无匹配回路'}
        </div>
      )}
    </div>
  );
}
