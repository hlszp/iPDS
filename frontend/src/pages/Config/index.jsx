import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

const LOOP_TYPES = ['FLOW', 'LEVEL', 'TEMP', 'PRESSURE', 'OTHER'];
const LOOP_CATEGORIES = ['快速型', '慢速型', '稳定型', '逻辑型'];
const FIELD_LABELS = {
  pv_tag: 'PV位号',
  sp_tag: 'SP位号',
  op_tag: 'OP位号',
  mode_tag: 'Mode位号',
  pv_range: 'PV量程',
  sample_interval: '采样周期',
};
const CATEGORY_BY_TYPE = {
  FLOW: '快速型',
  LEVEL: '慢速型',
  TEMP: '稳定型',
  PRESSURE: '稳定型',
  OTHER: '逻辑型',
};
const WEIGHT_BY_TYPE = {
  FLOW: 2,
  LEVEL: 1,
  TEMP: 3,
  PRESSURE: 3,
  OTHER: 1,
};
const EMPTY = {
  tag_name: '',
  unit: '',
  loop_type: 'FLOW',
  loop_category: '快速型',
  loop_weight: 2,
  loop_group_id: '',
  description: '',
  pv_tag: '',
  sp_tag: '',
  op_tag: '',
  mode_tag: '',
  eng_unit: '',
  pv_lo: null,
  pv_hi: null,
  sample_interval: 1,
};

export default function Config() {
  const [loops, setLoops] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const unitFilter = searchParams.get('unit') || '';
  const gradeFilter = searchParams.get('grade') || '';
  const tagFilter = searchParams.get('tag') || '';
  const warningField = searchParams.get('warningField') || '';

  const refresh = async () => {
    setError('');
    try {
      const [loopData, groupData, warningData] = await Promise.all([
        api.listLoops({ limit: 500, ...(unitFilter ? { unit: unitFilter } : {}) }),
        api.listGroups(unitFilter ? { unit: unitFilter } : {}),
        api.validateLoops(unitFilter || undefined),
      ]);
      setLoops(loopData);
      setGroups(groupData);
      setWarnings(warningData.warnings || []);
    } catch (e) {
      setError(e.message || '回路配置加载失败');
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [unitFilter]);

  useEffect(() => {
    if (!tagFilter || loops.length === 0) return;
    const target = loops.find((loop) => loop.tag_name === tagFilter);
    if (target) openEdit(target);
  }, [tagFilter, loops]);

  const groupOptions = useMemo(() => groups.filter((group) => !form.unit || group.unit === form.unit), [groups, form.unit]);
  const groupedWarnings = useMemo(() => {
    const map = new Map();
    warnings.forEach((warning) => {
      if (tagFilter && warning.tag !== tagFilter) return;
      if (warningField && warning.field !== warningField) return;
      const key = warning.tag;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(warning);
    });
    return Array.from(map.entries());
  }, [warnings, tagFilter, warningField]);

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
      loop_category: loop.loop_category || CATEGORY_BY_TYPE[loop.loop_type] || '快速型',
      loop_weight: loop.loop_weight ?? WEIGHT_BY_TYPE[loop.loop_type] ?? 1,
      loop_group_id: loop.loop_group_id ?? '',
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
      const payload = {
        ...form,
        loop_group_id: form.loop_group_id === '' ? null : Number(form.loop_group_id),
        loop_weight: Number(form.loop_weight) || 1,
        sample_interval: Number(form.sample_interval) || 1,
      };
      if (editing) {
        await api.updateLoop(editing.tag_name, payload);
      } else {
        await api.createLoop(payload);
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

  const setField = (key, value) => {
    if (key === 'loop_type') {
      setForm((prev) => ({
        ...prev,
        loop_type: value,
        loop_category: CATEGORY_BY_TYPE[value] || prev.loop_category,
        loop_weight: WEIGHT_BY_TYPE[value] ?? prev.loop_weight,
      }));
      return;
    }
    if (key === 'unit') {
      setForm((prev) => ({ ...prev, unit: value, loop_group_id: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div style={{ padding: 20, color: 'var(--text-dim)' }}>加载中...</div>;

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 'var(--font-lg)' }}>回路配置管理</h2>
          {(unitFilter || gradeFilter || tagFilter || warningField) && (
            <div style={{ marginTop: 6, color: 'var(--text-dim)', fontSize: 'var(--font-sm)' }}>
              {unitFilter && <>装置：<span style={{ color: '#fff' }}>{unitFilter}</span></>}
              {gradeFilter && <> · 评级：<span style={{ color: '#fff' }}>{gradeFilter}</span></>}
              {tagFilter && <> · 指定位号：<span style={{ color: '#fff' }}>{tagFilter}</span></>}
              {warningField && <> · 缺口：<span style={{ color: '#fff' }}>{FIELD_LABELS[warningField] || warningField}</span></>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(unitFilter || gradeFilter || tagFilter || warningField) && (
            <button onClick={() => nav('/config')}
              style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 'var(--font-md)', cursor: 'pointer' }}>
              查看全部
            </button>
          )}
          <button onClick={openAdd}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 'var(--font-md)', cursor: 'pointer' }}>
            + 新增回路
          </button>
        </div>
      </div>

      {groupedWarnings.length > 0 && (
        <div style={{ marginBottom: 16, padding: '14px 16px', border: '1px solid rgba(240,160,48,0.35)', borderRadius: 8, background: 'rgba(240,160,48,0.08)' }}>
          <div style={{ color: '#fff', fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 8 }}>待补全关键字段</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {groupedWarnings.map(([tag, items]) => (
              <button
                key={tag}
                onClick={() => {
                  const target = loops.find((loop) => loop.tag_name === tag);
                  if (target) openEdit(target);
                }}
                style={{ textAlign: 'left', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}
              >
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{tag}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)', lineHeight: 1.7 }}>
                  {items.map((item) => item.issue).join('；')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loops.length === 0 && !error && (
        <div style={{ marginBottom: 16, padding: '14px 16px', border: '1px solid rgba(240,160,48,0.35)', borderRadius: 8, background: 'rgba(240,160,48,0.08)' }}>
          <div style={{ color: '#fff', fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 4 }}>
            {unitFilter ? '该装置尚未完成回路配置' : '首次使用请先完成回路配置'}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)', lineHeight: 1.7 }}>
            推荐顺序：先导入或新增回路位号，再补全 PV / SP / OP / 量程等关键字段，最后返回驾驶舱查看评估结果。
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '14px 16px', border: '1px solid rgba(231,76,60,0.35)', borderRadius: 8, background: 'rgba(231,76,60,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: 4 }}>回路配置加载失败</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 'var(--font-sm)' }}>{error}</div>
          </div>
          <button onClick={refresh}
            style={{ padding: '8px 14px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>
            重试
          </button>
        </div>
      )}

      {(showAdd || editing) && (
        <FormPanel
          form={form}
          setField={setField}
          onSave={handleSave}
          onCancel={() => { setShowAdd(false); setEditing(null); }}
          saving={saving}
          isEdit={!!editing}
          groupOptions={groupOptions}
          warningItems={warnings.filter((warning) => warning.tag === form.tag_name)}
        />
      )}

      {!error && (loops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 'var(--font-lg)', color: '#fff', marginBottom: 8 }}>{unitFilter ? '该装置暂无回路配置' : '暂无回路配置'}</div>
          <div style={{ marginBottom: 20 }}>{unitFilter ? '请为该装置补充回路位号，或返回查看全部装置。' : '导入 DCS 位号表或手动添加回路标签。'}</div>
          <button onClick={openAdd} style={{ padding: '10px 24px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 'var(--font-md)', cursor: 'pointer' }}>+ 新增回路</button>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>位号</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>装置</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>回路组</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>类型/分类</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>权重</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>描述</th>
            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontWeight: 500 }}>操作</th>
          </tr></thead>
          <tbody>
            {loops.map((loop) => {
              const loopWarnings = warnings.filter((warning) => warning.tag === loop.tag_name);
              const group = groups.find((item) => item.id === loop.loop_group_id);
              return (
                <tr key={loop.tag_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px', color: '#fff', fontWeight: 600 }}>
                    {loop.tag_name}
                    {loopWarnings.length > 0 && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 400 }}>({loopWarnings.length}项待补全)</span>}
                  </td>
                  <td style={{ padding: '8px' }}>{loop.unit}</td>
                  <td style={{ padding: '8px', color: group ? '#fff' : 'var(--text-dim)' }}>{group?.name || '未分组'}</td>
                  <td style={{ padding: '8px' }}>{loop.loop_type} / {loop.loop_category || '—'}</td>
                  <td style={{ padding: '8px' }}>{loop.loop_weight ?? '—'}</td>
                  <td style={{ padding: '8px', color: 'var(--text-dim)' }}>{loop.description || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => openEdit(loop)}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '2px 10px', borderRadius: 3, fontSize: 'var(--font-sm)', marginRight: 4, cursor: 'pointer' }}>编辑</button>
                    <button onClick={() => handleDelete(loop.tag_name)}
                      style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--red)', padding: '2px 10px', borderRadius: 3, fontSize: 'var(--font-sm)', cursor: 'pointer' }}>删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function FormPanel({ form, setField, onSave, onCancel, saving, isEdit, groupOptions, warningItems }) {
  return (
    <div style={{ marginBottom: 16, padding: 16, background: 'var(--surface)', borderRadius: 6 }}>
      <h3 style={{ color: '#fff', fontSize: 'var(--font-md)', marginBottom: 12 }}>{isEdit ? '编辑回路' : '新增回路'}</h3>
      {warningItems.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(240,160,48,0.08)', border: '1px solid rgba(240,160,48,0.25)', borderRadius: 6, color: 'var(--text-dim)', fontSize: 'var(--font-sm)', lineHeight: 1.7 }}>
          {warningItems.map((item, index) => <div key={`${item.tag}-${item.field}-${index}`}>{item.issue}</div>)}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field label="位号" value={form.tag_name} onChange={(v) => setField('tag_name', v)} disabled={isEdit} />
        <Field label="装置" value={form.unit} onChange={(v) => setField('unit', v)} />
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: 2 }}>回路组</label>
          <select value={form.loop_group_id} onChange={(e) => setField('loop_group_id', e.target.value)}
            style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: 3, fontSize: 'var(--font-sm)' }}>
            <option value="">未分组</option>
            {groupOptions.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: 2 }}>类型</label>
          <select value={form.loop_type} onChange={(e) => setField('loop_type', e.target.value)}
            style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: 3, fontSize: 'var(--font-sm)' }}>
            {LOOP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: 2 }}>分类</label>
          <select value={form.loop_category} onChange={(e) => setField('loop_category', e.target.value)}
            style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: 3, fontSize: 'var(--font-sm)' }}>
            {LOOP_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <Field label="权重" value={form.loop_weight} onChange={(v) => setField('loop_weight', parseInt(v, 10) || 1)} type="number" />
        <Field label="描述" value={form.description} onChange={(v) => setField('description', v)} />
        <Field label="PV位号" value={form.pv_tag} onChange={(v) => setField('pv_tag', v)} />
        <Field label="SP位号" value={form.sp_tag} onChange={(v) => setField('sp_tag', v)} />
        <Field label="OP位号" value={form.op_tag} onChange={(v) => setField('op_tag', v)} />
        <Field label="Mode位号" value={form.mode_tag} onChange={(v) => setField('mode_tag', v)} />
        <Field label="工程单位" value={form.eng_unit} onChange={(v) => setField('eng_unit', v)} />
        <Field label="量程下限" value={form.pv_lo} onChange={(v) => setField('pv_lo', v === '' ? null : parseFloat(v))} type="number" />
        <Field label="量程上限" value={form.pv_hi} onChange={(v) => setField('pv_hi', v === '' ? null : parseFloat(v))} type="number" />
        <Field label="采样周期(s)" value={form.sample_interval} onChange={(v) => setField('sample_interval', parseInt(v, 10) || 1)} type="number" />
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={onSave} disabled={saving}
          style={{ padding: '8px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '8px 20px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: 4, cursor: 'pointer' }}>取消</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--font-sm)', color: 'var(--text-dim)', marginBottom: 2 }}>{label}</label>
      <input type={type || 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', color: '#fff', border: '1px solid var(--border)', borderRadius: 3, fontSize: 'var(--font-sm)', boxSizing: 'border-box' }} />
    </div>
  );
}
