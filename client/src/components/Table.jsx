import React from 'react';

const Table = ({ headers = [], children, className = '' }) => {
  return (
    <div className="table-responsive">
      <table className={`data-table ${className}`}>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, idx) => {
                const label = typeof h === 'string' ? h : h.label;
                const align = typeof h === 'object' && h.align ? `text-${h.align}` : '';
                return (
                  <th key={idx} className={align}>
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};

export default Table;
