import { useState } from 'react';
import { api } from '../../api/client';

export default function Commissioning() {
  const [tab, setTab] = useState('import');
  const [unit, setUnit] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [validations, setValidations] = useState(null);
  const [status, setStatus] = useState(null);

  const downloadTemplate = async () => {
    try {
      const res = await api.downloadTemplate();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'loop_import_template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus({ type: 'err', msg: '模板下载失败' });
    }
  };

  const handleImport = async () => {
    if (!file || !unit) return;
    setStatus({ type: 'loading', msg: '正在导入...' });
    try {
      const res = await api.importCsv(file, unit);
      const data = await res.json();
      setResult(data);
      setStatus({ type: 'ok', msg: `导入完成：成功 ${data.imported} 条，跳过 ${data.skipped} 条` });
    } catch {
      setStatus({ type: 'err', msg: '导入失败，请检查 CSV 文件格式' });
    }
  };

  const runValidation = async () => {
    setStatus({ type: 'loading', msg: '正在校验...' });
    try {
      const data = await api.validateLoops(unit || null);
      setValidations(data);
      setStatus({ type: 'ok', msg: `校验完成：${data.valid}/${data.total} 合规` });
    } catch {
      setStatus({ type: 'err', msg: '校验失败' });
    }
  };

  return (
    <div style={{padding:24,height:'100%',overflow:'auto'}}>
      <h2 style={{color:'#fff',fontSize:'var(--font-xl)',marginBottom:20}}>投运管理</h2>

      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--border)'}}>
        {[{k:'import',l:'CSV 导入'},{k:'validate',l:'数据校验'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'8px 20px',border:'none',background:'none',color:tab===t.k?'var(--accent)':'var(--text-dim)',borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',fontSize:'var(--font-md)',cursor:'pointer'}}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'import' ? (
        <div style={{maxWidth:500}}>
          <div style={{marginBottom:16}}>
            <button onClick={downloadTemplate}
              style={{padding:'6px 16px',background:'rgba(255,255,255,0.05)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:4,cursor:'pointer',fontSize:'var(--font-sm)'}}>
              ↓ 下载 CSV 模板
            </button>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>目标装置</label>
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="例如: 甲醇装置"
              style={{width:'100%',padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>CSV 文件</label>
            <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])}
              style={{color:'var(--text-dim)',fontSize:'var(--font-sm)'}} />
          </div>
          <button onClick={handleImport} disabled={!file||!unit}
            style={{padding:'10px 24px',background:(file&&unit)?'var(--accent)':'rgba(255,255,255,0.05)',color:(file&&unit)?'#000':'var(--text-dim)',border:'none',borderRadius:4,fontWeight:600,cursor:(file&&unit)?'pointer':'default'}}>
            导入回路
          </button>
          {result && (
            <div style={{marginTop:16,padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
              <div style={{color:'var(--green)'}}>✓ 成功导入: {result.imported} 条</div>
              <div style={{color:'var(--text-dim)'}}>跳过: {result.skipped} 条</div>
              {result.errors?.length > 0 && (
                <div style={{color:'var(--red)',marginTop:4}}>错误: {result.errors.join('; ')}</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{maxWidth:500}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'var(--text-dim)',fontSize:'var(--font-sm)',marginBottom:6}}>装置（可选）</label>
            <input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="留空校验全部"
              style={{width:'100%',padding:'8px 12px',background:'var(--surface)',color:'#fff',border:'1px solid var(--border)',borderRadius:4,fontSize:'var(--font-md)'}} />
          </div>
          <button onClick={runValidation}
            style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,cursor:'pointer'}}>
            开始校验
          </button>
          {validations && (
            <div style={{marginTop:16,padding:12,background:'rgba(255,255,255,0.03)',borderRadius:4,fontSize:'var(--font-sm)',lineHeight:2}}>
              <div style={{color:'var(--green)'}}>总计: {validations.total} | 合规: {validations.valid}</div>
              {validations.warnings?.length > 0 && (
                <div style={{marginTop:8}}>
                  <div style={{color:'var(--yellow)',marginBottom:4}}>告警 ({validations.warnings.length} 项):</div>
                  {validations.warnings.map((w,i) => (
                    <div key={i} style={{color:'var(--text-dim)',paddingLeft:8}}>
                      {w.tag}: {w.field} — {w.issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
