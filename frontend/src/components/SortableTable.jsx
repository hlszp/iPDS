import { useMemo, useState } from 'react';
import './ui/styles.css';

const GRADE_COLORS = {
  '优': 'var(--grade-excellent)',
  '良': 'var(--grade-good)',
  '中': 'var(--grade-medium)',
  '差': 'var(--grade-poor)',
  '开环': 'var(--grade-openloop)',
};

export default function SortableTable({ columns, rows, onRowClick, defaultSort, emptyText }) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0]?.key, dir: 'asc' });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sort.key] ?? '';
      const vb = b[sort.key] ?? '';
      if (typeof va === 'number') return sort.dir === 'asc' ? va - vb : vb - va;
      return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [rows, sort]);

  const handleSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  if (rows.length === 0) {
    return <div className="ui-state ui-state--empty"><div className="ui-state__title">{emptyText || '暂无数据'}</div></div>;
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'is-right' : ''}
                onClick={() => handleSort(col.key)}
              >
                <span>{col.label}</span>
                <span className="ui-table__sort">{sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.tag_name || i} className={onRowClick ? 'is-clickable' : ''} onClick={() => onRowClick && onRowClick(row)}>
              {columns.map((col) => {
                const val = row[col.key];
                let display = val;
                if (col.render) display = col.render(val, row);
                else if (typeof val === 'number') display = val.toFixed(1);
                else if (val === null || val === undefined) display = '—';
                const color = col.key === 'grade' && GRADE_COLORS[val] ? GRADE_COLORS[val] : undefined;
                return (
                  <td key={col.key} className={col.align === 'right' ? 'is-right' : ''} style={color ? { color } : undefined}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
