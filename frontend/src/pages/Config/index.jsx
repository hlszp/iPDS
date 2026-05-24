import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

const LOOP_TYPES = ['FLOW', 'LEVEL', 'TEMP', 'PRESSURE', 'OTHER'];

const EMPTY = { tag_name: '', unit: '', loop_type: 'FLOW', description: '', pv_tag: '', sp_tag: '', op_tag: '', mode_tag: '', eng_unit: '', pv_lo: null, pv_hi: null, sample_interval: 1 };

export default function Config() {
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | loop object to edit
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const unitFilter = searchParams.get('unit') || '';
  const gradeFilter = searchParams.get('grade') || '';

  const refresh = async () => {
    setError('');
    try {
      const data = await api.listLoops({ limit: 500, ...(unitFilter ? { unit: unitFilter } : {}) });
      setLoops(data);
    } catch (e) {
      setError(e.message || '回路配置加载失败');
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [unitFilter]);

  const openAdd = () => {
    setForm({ ...EMPTY, unit: unitFilter || '' });
    setShowAdd(true);
    setEditing(null);
  };

  const openEdit = (loop) => {
    setForm({
      tag_name: loop.tag_name,
      unit: loop.unit || '',
      loop_type: loop.loop_type || 'FLOW',
      description: loop.description || '',
      pv_tag: loop.pv_tag || '',
      sp_tag: loop.sp_tag || '',
      op_tag: loop.op_tag || '',
      mode_tag: loop.mode_tag || '',
      eng_unit: loop.eng_unit || '',
      pv_lo: loop.pv_lo ?? null,
      pv_hi: loop.pv_hi ?? null,
      sample_interval: loop.sample_interval || 1,
    });
    setEditing(loop);
    setShowAdd(false);
  };

  const handleSave = async () => {
    if (!form.tag_name || !form.unit) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateLoop(editing.tag_name, form);
      } else {
        await api.createLoop(form);
      }
      setEditing(null);
      setShowAdd(false);
      setForm({ ...EMPTY });
      await refresh();
    } catch (e) {
      setError(e.message || '保存失败');
    }
    setSaving(false);
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`确认删除回路 ${tag}？`)) return;
    try {
      await api.deleteLoop(tag);
      await refresh();
    } catch (e) {
      setError(e.message || '删除失败');
    }
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <div style={{padding:20,color:'var(--text-dim)'}}>加载中...</div>;

  return (
    <div style={{padding:20,overflow:'auto',height:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h2 style={{color:'#fff',fontSize:'var(--font-lg)'}}>回路配置管理</h2>
          {unitFilter && (
            <div style={{marginTop:6,color:'var(--text-dim)',fontSize:'var(--font-sm)'}}>
              当前按装置筛选：<span style={{color:'#fff'}}>{unitFilter}</span>{gradeFilter ? ` · 来自 ${gradeFilter} 评热力图` : ''}
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8}}>
          {unitFilter && (
            <button onClick={() => nav('/config')}
              style={{padding:'8px 16px',background:'none',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',fontSize:'var(--font-md)',cursor:'pointer'}}>
              查看全部
            </button>
          )}
          <button onClick={openAdd}
            style={{padding:'8px 16px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)',cursor:'pointer'}}>
            + 新增回路
          </button>
        </div>
      </div>

      {loops.length === 0 && !error && (
        <div style={{marginBottom:16,padding:'14px 16px',border:'1px solid rgba(240,160,48,0.35)',borderRadius:8,background:'rgba(240,160,48,0.08)'}}>
          <div style={{color:'#fff',fontSize:'var(--font-md)',fontWeight:600,marginBottom:4}}>
            {unitFilter ? '该装置尚未完成回路配置' : '首次使用请先完成回路配置'}
          </div>
          <div style={{color:'var(--text-dim)',fontSize:'var(--font-sm)',lineHeight:1.7}}>
            推荐顺序：先导入或新增回路位号，再补全 PV / SP / OP / 量程等关键字段，最后返回驾驶舱查看评估结果。
          </div>
        </div>
      )}

      {error && (
        <div style={{marginBottom:16,padding:'14px 16px',border:'1px solid rgba(231,76,60,0.35)',borderRadius:8,background:'rgba(231,76,60,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{color:'#fff',fontSize:'var(--font-md)',fontWeight:600,marginBottom:4}}>回路配置加载失败</div>
            <div style={{color:'var(--text-dim)',fontSize:'var(--font-sm)'}}>{error}</div>
          </div>
          <button onClick={refresh}
            style={{padding:'8px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,cursor:'pointer'}}>
            重试
          </button>
        </div>
      )}

      {(showAdd || editing) && (
        <FormPanel form={form} setField={setField} onSave={handleSave} onCancel={() => { setShowAdd(false); setEditing(null); }}
          saving={saving} isEdit={!!editing} />
      )}

      {!error && (loops.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'var(--text-dim)'}}>
          <div style={{fontSize:'var(--font-lg)',color:'#fff',marginBottom:8}}>{unitFilter ? '该装置暂无回路配置' : '暂无回路配置'}</div>
          <div style={{marginBottom:20}}>{unitFilter ? '请为该装置补充回路位号，或返回查看全部装置。' : '导入 DCS 位号表或手动添加回路标签。'}</div>
          <button onClick={openAdd} style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,fontSize:'var(--font-md)',cursor:'pointer'}}>+ 新增回路</button>
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
            {loops.map(l => (
              <tr key={l.tag_name} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <td style={{padding:'8px',color:'#fff',fontWeight:600}}>{l.tag_name}</td>
                <td style={{padding:'8px'}}>{l.unit}</td>
                <td style={{padding:'8px'}}>{l.loop_type}</td>
                <td style={{padding:'8px',color:'var(--text-dim)'}}>{l.description || '—'}</td>
                <td style={{padding:'8px'}}>
                  <button onClick={() => openEdit(l)}
                    style={{background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',padding:'2px 10px',borderRadius:3,fontSize:'var(--font-sm)',marginRight:4,cursor:'pointer'}}>编辑</button>
                  <button onClick={() => handleDelete(l.tag_name)}
                    style={{background:'none',border:'1px solid var(--border)',color:'var(--red)',padding:'2px 10px',borderRadius:3,fontSize:'var(--font-sm)',cursor:'pointer'}}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function FormPanel({ form, setField, onSave, onCancel, saving, isEdit }) {
  return (
    <div style={{marginBottom:16,padding:16,background:'var(--surface)',borderRadius:6}}>
      <h3 style={{color:'#fff',fontSize:'var(--font-md)',marginBottom:12}}>{isEdit ? '编辑回路' : '新增回路'}</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        <Field label="位号" value={form.tag_name} onChange={v=>setField('tag_name',v)} disabled={isEdit} />
        <Field label="装置" value={form.unit} onChange={v=>setField('unit',v)} />
        <div>
          <label style={{display:'block',fontSize:'var(--font-sm)',color:'var(--text-dim)',marginBottom:2}}>类型</label>
          <select value={form.loop_type} onChange={e=>setField('loop_type',e.target.value)}
            style={{width:'100%',padding:'6px 8px',background:'var(--bg)',color:'#fff',border:'1px solid var(--border)',borderRadius:3,fontSize:'var(--font-sm)'}}>
            {LOOP_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Field label="描述" value={form.description} onChange={v=>setField('description',v)} />
        <Field label="PV位号" value={form.pv_tag} onChange={v=>setField('pv_tag',v)} />
        <Field label="SP位号" value={form.sp_tag} onChange={v=>setField('sp_tag',v)} />
        <Field label="OP位号" value={form.op_tag} onChange={v=>setField('op_tag',v)} />
        <Field label="Mode位号" value={form.mode_tag} onChange={v=>setField('mode_tag',v)} />
        <Field label="工程单位" value={form.eng_unit} onChange={v=>setField('eng_unit',v)} />
        <Field label="量程下限" value={form.pv_lo} onChange={v=>setField('pv_lo',v ? parseFloat(v) : null)} type="number" />
        <Field label="量程上限" value={form.pv_hi} onChange={v=>setField('pv_hi',v ? parseFloat(v) : null)} type="number" />
        <Field label="采样周期(s)" value={form.sample_interval} onChange={v=>setField('sample_interval',parseInt(v)||1)} type="number" />
      </div>
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button onClick={onSave} disabled={saving}
          style={{padding:'8px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:4,fontWeight:600,cursor:saving?'wait':'pointer'}}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={onCancel}
          style={{padding:'8px 20px',background:'none',border:'1px solid var(--border)',color:'var(--text-dim)',borderRadius:4,cursor:'pointer'}}>取消</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type }) {
  return (
    <div>
      <label style={{display:'block',fontSize:'var(--font-sm)',color:'var(--text-dim)',marginBottom:2}}>{label}</label>
      <input type={type||'text'} value={value ?? ''} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{width:'100%',padding:'6px 8px',background:'var(--bg)',color:'#fff',border:'1px solid var(--border)',borderRadius:3,fontSize:'var(--font-sm)',boxSizing:'border-box'}} />
    </div>
  );
}
