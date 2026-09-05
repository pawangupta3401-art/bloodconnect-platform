import React from 'react';

/**
 * Design System Table
 * Header #F5F7FA, row border #E2E8F0, optional alternating row shading
 */
export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  className = '',
  style = {},
}) {
  return (
    <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px', border: '1px solid var(--ds-border-gray)' }}>
      <table className={`ds-table ${className}`} style={style}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} style={col.style || {}}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--ds-slate-gray)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row[keyField] || rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={col.key || colIdx} style={col.cellStyle || {}}>
                    {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
