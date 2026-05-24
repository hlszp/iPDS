import { useState, useEffect } from 'react';
import { api } from '../../api/client';

export default function Reports() {
  const [tab, setTab] = useState('single');
  const [loops, setLoops] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [unit, setUnit] = useState('全厂');
  const [period, setPeriod] = useState('日报');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.listLoops({ limit: 500 }).then(setLoops).catch(() => {});
  }, []);

  const generateSingle = async () => {
    if (!selectedTag) return;
    setStatus({ type: 'loading', msg: '正在生成报告...' });
    try {
      const res = await api.generateLoopReport(selectedTag);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${selectedTag}_report.pdf`; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'ok', msg: '报告已下载' });
    } catch {
      setStatus({ type: 'err', msg: '报告生成失败' });
    }
  };

  const generateBatch = async () => {
    setStatus({ type: 'loading', msg: '正在生成批量报告...' });
    try {
      const res = await api.generateBatchReport(unit, period);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${unit}_${period}.pdf`; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'ok', msg: '批量报告已下载' });
    } catch {
      setStatus({ type: 'err', msg: '报告生成失败' });
    }
  };

  const units = ['全厂', ...new Set(loops.map(l => l.unit).filter(Boolean))];

  return (
    <div style={{padding:24,height:'100%',overflow:'auto'}}>
      <h2 style={{color:'#fff',fontSize:'var(--font-xl)',marginBottom:20}}>评估报告</h2>

      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--border)'}}>
        {[{k:'single',l:'单回路报告'},{k:'batch',l:'批量报告'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'8px 20px',border:'none',background:'none',color:tab===t.k?'var(--accent)':'var(--text-dim)',borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',fontSize:'var(--font-md)',cursor:'pointer'}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'single' ? (
        <div style={{maxWidth:500}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>选择回路</label>
            <select value={selectedTag} onChange={e=>setSelectedTag(e.target.value)}
              style={{width:'100%',padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}}>
              <option value="">— 请选择 —</option>
              {loops.map(l => <option key={l.tag_name} value={l.tag_name}>{l.tag_name} · {l.unit}</option>)}
            </select>
          </div>
          <button onClick={generateSingle} disabled={!selectedTag}
            style={{padding:'10px 24px',background:selectedTag?'var(--accent)':'rgba(255,255,255,0.05)',color:selectedTag?'#000':'var(--text-dim)',border:'none',borderRadius:4,fontWeight:600,cursor:selectedTag?'pointer':'default'}}>
            生成报告
          </button>
        </div>
      ) : (
        <div style={{maxWidth:500}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>装置</label>
            <select value={unit} onChange={e=>setUnit(e.target.value)}
              style={{width:'100%',padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>报告类型</label>
            <select value={period} onChange={e=>setPeriod(e.target.value)}
              style={{width:'100%',padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}}>
              {['日报','周报','月报'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={generateBatch}
            style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,cursor:'pointer'}}>
            生成批量报告
          </button>
        </div>
      )}

      {status && (
        <div style={{marginTop:16,padding:'10px 16px',borderRadius:4,fontSize:'var(--font-sm)',
          background:status.type==='loading'?'rgba(240,160,48,0.1)':status.type==='ok'?'rgba(46,204,113,0.1)':'rgba(231,76,60,0.1)',
          color:status.type==='loading'?'var(--accent)':status.type==='ok'?'var(--green)':'var(--red)'}}>
          {status.msg}
        </div>
      )}
    </div>
  );
}
