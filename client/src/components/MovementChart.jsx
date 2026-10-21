import React, { useState } from 'react';

const MovementChart = ({
  data = [],
  period = 30,
  summary = { stockIn: 0, stockOut: 0, transfer: 0 },
  onPeriodChange,
  loading = false
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const periods = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 }
  ];

  // Calculate highest daily single or total value for chart scaling
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.stockIn || 0, d.stockOut || 0, d.transfer || 0)),
    10
  );

  const chartHeight = 180;
  const paddingBottom = 28;
  const effectiveHeight = chartHeight - paddingBottom;

  // Format short date for X-axis
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parseInt(parts[1], 10) - 1] || parts[1];
    return `${month} ${parseInt(parts[2], 10)}`;
  };

  // Determine which dates get an X-axis label to avoid overcrowding
  const shouldShowLabel = (index, total) => {
    if (total <= 7) return true;
    if (total <= 14) return index % 2 === 0;
    if (total <= 30) return index % 5 === 0 || index === total - 1;
    return index % 15 === 0 || index === total - 1;
  };

  return (
    <div className="movement-chart-wrapper">
      {/* Header with Period Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="movement-summary-chips">
          <div className="movement-chip">
            <span className="movement-chip-dot" style={{ background: '#10b981' }} />
            <span>In: <strong>+{summary.stockIn.toLocaleString()}</strong></span>
          </div>
          <div className="movement-chip">
            <span className="movement-chip-dot" style={{ background: '#ef4444' }} />
            <span>Out: <strong>-{summary.stockOut.toLocaleString()}</strong></span>
          </div>
          <div className="movement-chip">
            <span className="movement-chip-dot" style={{ background: '#f59e0b' }} />
            <span>Transfer: <strong>{summary.transfer.toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="period-btn-group">
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`period-btn ${period === p.value ? 'active' : ''}`}
              onClick={() => onPeriodChange && onPeriodChange(p.value)}
              disabled={loading}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas / SVG Container */}
      <div className="svg-chart-container" style={{ position: 'relative', marginTop: '0.5rem' }}>
        {loading ? (
          <div className="skeleton-box" style={{ width: '100%', height: `${chartHeight}px` }} />
        ) : data.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No movement activity recorded in this period.
          </div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <svg
              viewBox={`0 0 ${Math.max(600, data.length * 28)} ${chartHeight}`}
              style={{ width: '100%', minWidth: '480px', height: `${chartHeight}px`, overflow: 'visible' }}
            >
              {/* Horizontal gridlines */}
              {[0, 0.33, 0.66, 1].map((ratio) => {
                const y = effectiveHeight - ratio * effectiveHeight + 10;
                return (
                  <line
                    key={ratio}
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Grouped bars for each day */}
              {data.map((d, i) => {
                const totalPoints = data.length;
                const svgWidth = Math.max(600, totalPoints * 28);
                const step = svgWidth / totalPoints;
                const xCenter = i * step + step / 2;

                const barWidth = Math.max(3, Math.min(8, step / 3.8));
                const inHeight = Math.max(2, (d.stockIn / maxValue) * effectiveHeight);
                const outHeight = Math.max(2, (d.stockOut / maxValue) * effectiveHeight);
                const trHeight = Math.max(2, (d.transfer / maxValue) * effectiveHeight);

                const baseY = effectiveHeight + 10;

                return (
                  <g
                    key={d.date || i}
                    onMouseEnter={() => setHoveredPoint(d)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Hover hit area */}
                    <rect
                      x={i * step}
                      y="0"
                      width={step}
                      height={chartHeight}
                      fill={hoveredPoint?.date === d.date ? 'rgba(255, 255, 255, 0.04)' : 'transparent'}
                    />

                    {/* Stock IN bar */}
                    {d.stockIn > 0 && (
                      <rect
                        x={xCenter - barWidth * 1.6}
                        y={baseY - inHeight}
                        width={barWidth}
                        height={inHeight}
                        fill="#10b981"
                        rx="2"
                      />
                    )}

                    {/* Stock OUT bar */}
                    {d.stockOut > 0 && (
                      <rect
                        x={xCenter - barWidth * 0.5}
                        y={baseY - outHeight}
                        width={barWidth}
                        height={outHeight}
                        fill="#ef4444"
                        rx="2"
                      />
                    )}

                    {/* Transfer bar */}
                    {d.transfer > 0 && (
                      <rect
                        x={xCenter + barWidth * 0.6}
                        y={baseY - trHeight}
                        width={barWidth}
                        height={trHeight}
                        fill="#f59e0b"
                        rx="2"
                      />
                    )}

                    {/* Date label */}
                    {shouldShowLabel(i, totalPoints) && (
                      <text
                        x={xCenter}
                        y={chartHeight - 6}
                        fill="var(--text-muted)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {formatShortDate(d.date)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  📅 {hoveredPoint.date}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <span style={{ color: '#34d399' }}>Stock IN: +{hoveredPoint.stockIn}</span>
                  <span style={{ color: '#f87171' }}>Stock OUT: -{hoveredPoint.stockOut}</span>
                  <span style={{ color: '#fbbf24' }}>Transfer: {hoveredPoint.transfer}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MovementChart;
