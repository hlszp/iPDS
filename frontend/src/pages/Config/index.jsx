import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function Config() {
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLoops().then(d => { setLoops(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding:20,color:'var(--text-dim)'}}>加载中...</div>;

  return (
    <div style={{padding:20,overflow:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>回路配置管理</h2>
        <button style={{padding:'8px 16px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)'}}>+ 新增回路</button>
      </div>
      {loops.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'var(--text-dim)'}}>
          <div style={{fontSize:32,marginBottom:12,opacity:0.3}}>📋</div>
          <div style={{fontSize:'var(--font-lg)',color:'#fff',marginBottom:8}}>暂无回路配置</div>
          <div style={{marginBottom:20}}>导入 DCS 位号表或手动添加回路标签</div>
          <button style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)'}}>导入 CSV</button>
        </div>
      ) : (
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'var(--font-sm)'}}>
          <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
            <th style={{textAlign:'left',padding:'8px',color:'var(--text-dim)',fontWeight:500}}>位号</th>
            <th style={{textAlign:'left',padding:'8px',color:'var(--text-dim)',fontWeight:500}}>装置</th>
            <th style={{textAlign:'left',padding:'8px',color:'var(--text-dim)',fontWeight:500}}>类型</th>
            <th style={{textAlign:'left',padding:'8px',color:'var(--text-dim)',fontWeight:500}}>描述</th>
            <th style={{textAlign:'left',padding:'8px',color:'var(--text-dim)',fontWeight:500}}>操作</th>
          </tr></thead>
          <tbody>
            {loops.map(l=>(
              <tr key={l.tag_name} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <td style={{padding:'8px',color:'#fff',fontWeight:600}}>{l.tag_name}</td>
                <td style={{padding:'8px'}}>{l.unit}</td>
                <td style={{padding:'8px'}}>{l.loop_type}</td>
                <td style={{padding:'8px',color:'var(--text-dim)'}}>{l.description || '—'}</td>
                <td style={{padding:'8px'}}>
                  <button style={{background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',padding:'2px 10px',borderRadius:3,fontSize:'var(--font-sm)',marginRight:4}}>编辑</button>
                  <button style={{background:'none',border:'1px solid var(--border)',color:'var(--red)',padding:'2px 10px',borderRadius:3,fontSize:'var(--font-sm)'}}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
