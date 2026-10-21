import React from 'react';

const LocationChart = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="location-bars-container" style={{ padding: '1rem 0' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="location-bar-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div className="skeleton-box" style={{ width: '120px', height: '16px' }} />
              <div className="skeleton-box" style={{ width: '60px', height: '16px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '100%', height: '10px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No warehouse location data available.
      </div>
    );
  }

  const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const maxQuantity = Math.max(...data.map((item) => item.quantity || 0), 1);

  // Gradient themes for top locations
  const gradientStyles = [
    'linear-gradient(90deg, #3b82f6, #60a5fa)',
    'linear-gradient(90deg, #10b981, #34d399)',
    'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    'linear-gradient(90deg, #f59e0b, #fbbf24)',
    'linear-gradient(90deg, #ec4899, #f472b6)',
    'linear-gradient(90deg, #06b6d4, #22d3ee)'
  ];

  return (
    <div className="location-bars-container">
      {data.map((item, index) => {
        const qty = item.quantity || 0;
        const percent = totalQuantity > 0 ? ((qty / totalQuantity) * 100).toFixed(1) : 0;
        const barWidth = totalQuantity > 0 ? Math.max(qty > 0 ? 5 : 0, (qty / maxQuantity) * 100) : 0;
        const gradient = gradientStyles[index % gradientStyles.length];

        return (
          <div key={item.locationId || item.location || index} className="location-bar-item">
            <div className="location-bar-info">
              <div>
                <span className="location-bar-name">{item.location}</span>
                {item.city && <span className="location-bar-city">({item.city})</span>}
              </div>
              <div>
                <span className="location-bar-qty">{qty.toLocaleString()} units</span>
                <span className="location-bar-percent">({percent}%)</span>
              </div>
            </div>
            <div className="location-bar-track">
              <div
                className="location-bar-fill"
                style={{
                  width: `${barWidth}%`,
                  background: gradient
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LocationChart;
