/**
 * Utility to export tabular data to a well-formatted CSV file.
 * Handles quoting, commas, newlines, nulls, and UTF-8 encoding.
 * 
 * @param {string} filename - Desired download filename (e.g., 'inventory-report.csv')
 * @param {Array<{ label: string, key: string | Function }>} columns - Column definitions
 * @param {Array<Object>} data - Array of row objects
 */
export const exportToCsv = (filename, columns, data) => {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  // Helper to format and escape CSV cell values
  const escapeCell = (value) => {
    if (value === null || value === undefined) {
      return '""';
    }

    let str = typeof value === 'object' && value instanceof Date
      ? value.toISOString().split('T')[0]
      : String(value);

    // Escape quotes by doubling them
    str = str.replace(/"/g, '""');

    // If cell contains comma, quote, newline, or carriage return, enclose in quotes
    if (/[",\n\r]/.test(str)) {
      return `"${str}"`;
    }

    return `"${str}"`;
  };

  // Header row
  const headerRow = columns.map((col) => escapeCell(col.label)).join(',');

  // Data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        let val;
        if (typeof col.key === 'function') {
          val = col.key(row);
        } else {
          val = row[col.key];
        }
        return escapeCell(val);
      })
      .join(',');
  });

  // Combine with UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
