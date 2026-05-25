import { useState } from 'react';

const GRADE_COLORS = { '优': 'var(--green)', '良': 'var(--blue)', '中': 'var(--yellow)', '差': 'var(--red)', '开环': 'var(--gray)' };

export default function SortableTable({ columns, rows, onRowClick, defaultSort, emptyText }) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0]?.key, dir: 'asc' });

  const handleSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const sorted = [...rows].sort((a, b) => {
    const va = a[sort.key] ?? '';
    const vb = b[sort.key] ?? '';
    if (typeof va === 'number') return sort.dir === 'asc' ? va - vb : vb - va;
    return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  if (rows.length === 0) {
    return <div style={st.empty}>{emptyText || '暂无数据'}</div>;
  }

  return (
    <table style={st.table}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{ ...st.th, ...(col.align === 'right' ? { textAlign: 'right' } : {}), cursor: 'pointer' }}
              onClick={() => handleSort(col.key)}>
              {col.label}
              <span style={st.sortArrow}>
                {sort.key === col.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={row.tag_name || i} style={{ ...st.tr, cursor: onRowClick ? 'pointer' : 'default' }}
            onClick={() => onRowClick && onRowClick(row)}>
            {columns.map((col) => {
              const val = row[col.key];
              let display = val;
              if (col.render) display = col.render(val, row);
              else if (typeof val === 'number') display = val.toFixed(1);
              else if (val === null || val === undefined) display = '—';
              let color = st.td.color;
              if (col.key === 'grade' && GRADE_COLORS[val]) color = GRADE_COLORS[val];
              return (
                <td key={col.key} style={{ ...st.td, ...(col.align === 'right' ? { textAlign: 'right' } : {}), color }}>
                  {display}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const st = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' },
  th: { padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-dim)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  sortArrow: { fontSize: 10, marginLeft: 2 },
  tr: { borderBottom: '1px solid var(--border)' },
  'tr:hover': {},
  td: { padding: '8px 12px', color: 'var(--text)', fontSize: 13 },
  empty: { padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 },
};
