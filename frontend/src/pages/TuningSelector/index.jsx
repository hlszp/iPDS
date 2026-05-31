import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import SortableTable from '../../components/SortableTable';
import { FilterBar, FilterGroup, Panel, StateBlock } from '../../components/ui';

const TUNING_COLUMNS = [
  { key: 'tag_name', label: '位号' },
  { key: 'unit', label: '装置' },
  { key: 'loop_type', label: '回路类型' },
  { key: 'description', label: '描述' },
  {
    key: 'action',
    label: '操作',
    sortable: false,
    nowrap: true,
    render: (_, row) => <span style={{ color: 'var(--accent-strong)', fontWeight: 700 }}>进入整定</span>,
  },
];

export default function TuningSelector() {
  const [loops, setLoops] = useState([]);
  const [filter, setFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');
    api.listLoops({ limit: 500 })
      .then((items) => setLoops(items || []))
      .catch((e) => {
        setLoops([]);
        setError(e.message || '整定入口加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const units = useMemo(() => [...new Set(loops.map((loop) => loop.unit).filter(Boolean))], [loops]);
  const filtered = useMemo(() => loops.filter((loop) => {
    if (unitFilter && loop.unit !== unitFilter) return false;
    if (filter && !loop.tag_name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  }), [filter, loops, unitFilter]);

  const rows = filtered.map((loop) => ({ ...loop, action: loop.tag_name }));

  return (
    <div className="ui-stack">
      <Panel
        title="整定入口清单"
        subtitle="统一筛选待优化对象，再从主表直接进入 PID 参数整定与闭环仿真。"
        actions={(
          <FilterBar align="right">
            <FilterGroup>
              <input className="ui-input" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="搜索位号..." />
              <select className="ui-select" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                <option value="">全部装置</option>
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </FilterGroup>
          </FilterBar>
        )}
        padded={false}
      >
        <div className="ui-panel__body">
          {error ? (
            <StateBlock type="error" title="整定入口加载失败" detail={error} />
          ) : (
            <SortableTable
              columns={TUNING_COLUMNS}
              rows={rows}
              loading={loading}
              emptyText={loops.length === 0 ? '当前没有可整定回路' : '无匹配回路'}
              emptyDetail={loops.length === 0 ? '请先完成回路建模或等待配置同步。' : '请调整筛选条件后重试。'}
              onRowClick={(row) => nav(`/loop/${row.tag_name}/tuning`, { state: { sourceTitle: '整定工作台', returnLabel: '返回整定入口', returnTo: '/tuning' } })}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}
