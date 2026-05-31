import { useMemo, useState } from 'react';
import { StateBlock } from './ui';
import './ui/styles.css';

const GRADE_COLORS = {
  '优': 'var(--grade-excellent)',
  '良': 'var(--grade-good)',
  '中': 'var(--grade-medium)',
  '差': 'var(--grade-poor)',
  '开环': 'var(--grade-openloop)',
};

function compareValues(a, b, dir) {
  if (typeof a === 'number' && typeof b === 'number') return dir === 'asc' ? a - b : b - a;
  return dir === 'asc' ? String(a).localeCompare(String(b), 'zh-CN') : String(b).localeCompare(String(a), 'zh-CN');
}

export default function SortableTable({
  columns,
  rows,
  onRowClick,
  defaultSort,
  emptyText,
  emptyDetail,
  emptyState,
  loading = false,
  loadingRows = 6,
  rowKey,
  selectedRow,
}) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0]?.key, dir: 'asc' });

  const sorted = useMemo(() => {
    if (!sort?.key) return rows;
    return [...rows].sort((left, right) => {
      const column = columns.find((item) => item.key === sort.key);
      const leftValue = column?.sortValue ? column.sortValue(left[sort.key], left) : left[sort.key] ?? '';
      const rightValue = column?.sortValue ? column.sortValue(right[sort.key], right) : right[sort.key] ?? '';
      const result = compareValues(leftValue, rightValue, sort.dir);
      if (result !== 0) return result;
      return compareValues(rowKey ? rowKey(left) : left.tag_name || left.label || '', rowKey ? rowKey(right) : right.tag_name || right.label || '', 'asc');
    });
  }, [columns, rowKey, rows, sort]);

  const handleSort = (column) => {
    if (column.sortable === false) return;
    setSort((prev) => ({ key: column.key, dir: prev.key === column.key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  if (loading) {
    return (
      <div className="ui-table-wrap">
        <table className="ui-table ui-table--skeleton">
          <thead>
            <tr>
              {columns.map((col) => <th key={col.key} className={col.align === 'right' ? 'is-right' : ''}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: loadingRows }).map((_, index) => (
              <tr key={`loading-${index}`}>
                {columns.map((col) => (
                  <td key={`${col.key}-${index}`} className={col.align === 'right' ? 'is-right' : ''}>
                    <span className="ui-table__skeleton" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return emptyState || (
      <StateBlock
        type="empty"
        compact
        title={emptyText || '暂无数据'}
        detail={emptyDetail || '调整筛选条件或等待数据刷新后重试。'}
      />
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.align === 'right' ? 'is-right' : ''} ${col.sortable === false ? '' : 'is-sortable'} ${sort.key === col.key ? 'is-active' : ''}`.trim()}
                onClick={() => handleSort(col)}
                style={col.width ? { width: col.width } : undefined}
              >
                <span>{col.label}</span>
                <span className="ui-table__sort">{col.sortable === false ? '' : sort.key === col.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const key = rowKey ? rowKey(row) : row.tag_name || row.label || index;
            const isSelected = typeof selectedRow === 'function' ? selectedRow(row) : selectedRow === key;
            return (
              <tr
                key={key}
                className={`${onRowClick ? 'is-clickable' : ''} ${isSelected ? 'is-selected' : ''}`.trim()}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col) => {
                  const val = row[col.key];
                  let display = val;
                  if (col.render) display = col.render(val, row);
                  else if (typeof val === 'number') display = col.format ? col.format(val, row) : val.toFixed(1);
                  else if (val === null || val === undefined || val === '') display = '—';
                  const tone = col.tone ? col.tone(val, row) : (col.key === 'grade' && GRADE_COLORS[val] ? GRADE_COLORS[val] : undefined);
                  return (
                    <td
                      key={col.key}
                      className={`${col.align === 'right' ? 'is-right' : ''} ${col.nowrap ? 'is-nowrap' : ''}`.trim()}
                      style={{ ...(col.width ? { width: col.width } : null), ...(tone ? { color: tone } : null) }}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
