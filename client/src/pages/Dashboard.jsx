import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import Table from '../components/Table';
import EmptyState from '../components/EmptyState';
import LocationChart from '../components/LocationChart';
import MovementChart from '../components/MovementChart';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core metrics
  const [stats, setStats] = useState({
    summary: {
      totalProducts: 0,
      totalInventoryQuantity: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalLocations: 0,
      totalSuppliers: 0,
      totalCategories: 0,
      totalBatches: 0
    },
    movements: {
      stockIn: 0,
      stockOut: 0,
      transfer: 0
    }
  });

  // Analytics data
  const [locationInventory, setLocationInventory] = useState([]);
  const [movementPeriod, setMovementPeriod] = useState(30);
  const [movementData, setMovementData] = useState({
    data: [],
    summary: { stockIn: 0, stockOut: 0, transfer: 0 }
  });
  const [movementLoading, setMovementLoading] = useState(false);

  // Operational tables
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);

  // Fetch initial dashboard metrics
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        statsRes,
        locRes,
        movRes,
        lowRes,
        expRes,
        recentRes
      ] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/inventory-by-location'),
        api.get(`/dashboard/stock-movements?period=${movementPeriod}`),
        api.get('/dashboard/low-stock?limit=6'),
        api.get('/dashboard/expiring?limit=6'),
        api.get('/dashboard/recent-movements?limit=6')
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (locRes.data?.success) {
        setLocationInventory(locRes.data.data || []);
      }
      if (movRes.data?.success) {
        setMovementData({
          data: movRes.data.data || [],
          summary: movRes.data.summary || { stockIn: 0, stockOut: 0, transfer: 0 }
        });
      }
      if (lowRes.data?.success) {
        setLowStockProducts(lowRes.data.data || []);
      }
      if (expRes.data?.success) {
        setExpiringBatches(expRes.data.data || []);
      }
      if (recentRes.data?.success) {
        setRecentMovements(recentRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [movementPeriod]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle period change for stock movements chart
  const handlePeriodChange = async (newPeriod) => {
    setMovementPeriod(newPeriod);
    setMovementLoading(true);
    try {
      const res = await api.get(`/dashboard/stock-movements?period=${newPeriod}`);
      if (res.data?.success) {
        setMovementData({
          data: res.data.data || [],
          summary: res.data.summary || { stockIn: 0, stockOut: 0, transfer: 0 }
        });
      }
    } catch (err) {
      console.error('Failed to update movement analytics:', err);
    } finally {
      setMovementLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading real-time inventory analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page" style={{ padding: '2rem 0' }}>
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', borderColor: 'var(--danger-color)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Analytics Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {error}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={fetchDashboardData}
            style={{ width: 'fit-content', margin: '0 auto' }}
          >
            🔄 Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { summary } = stats;

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Inventory Dashboard & Analytics</h1>
          <p>Real-time stock monitoring, multi-warehouse metrics, and supply chain telemetry</p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={fetchDashboardData}
            title="Refresh dashboard metrics"
          >
            🔄 Refresh Live Data
          </button>
        </div>
      </div>

      {/* 1. Summary Cards Grid */}
      <div className="metrics-grid">
        {/* Total Products */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            📦
          </div>
          <div className="metric-details">
            <span className="metric-val">{(summary.totalProducts || 0).toLocaleString()}</span>
            <span className="metric-lbl">Total Products</span>
          </div>
        </div>

        {/* Total Stock */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            📊
          </div>
          <div className="metric-details">
            <span className="metric-val">{(summary.totalInventoryQuantity || 0).toLocaleString()}</span>
            <span className="metric-lbl">Total Stock (Units)</span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            ⚠️
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: summary.lowStockItems > 0 ? '#fbbf24' : 'var(--text-primary)' }}>
              {summary.lowStockItems || 0}
            </span>
            <span className="metric-lbl">Low Stock Alerts</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            🚫
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: summary.outOfStockItems > 0 ? '#f87171' : 'var(--text-primary)' }}>
              {summary.outOfStockItems || 0}
            </span>
            <span className="metric-lbl">Out of Stock Items</span>
          </div>
        </div>

        {/* Locations */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            🏢
          </div>
          <div className="metric-details">
            <span className="metric-val">{summary.totalLocations || 0}</span>
            <span className="metric-lbl">Active Locations</span>
          </div>
        </div>

        {/* Suppliers */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
            🚚
          </div>
          <div className="metric-details">
            <span className="metric-val">{summary.totalSuppliers || 0}</span>
            <span className="metric-lbl">Active Suppliers</span>
          </div>
        </div>

        {/* Categories */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' }}>
            🏷️
          </div>
          <div className="metric-details">
            <span className="metric-val">{summary.totalCategories || 0}</span>
            <span className="metric-lbl">Categories</span>
          </div>
        </div>

        {/* Total Batches */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            🔢
          </div>
          <div className="metric-details">
            <span className="metric-val">{summary.totalBatches || 0}</span>
            <span className="metric-lbl">Total Batches</span>
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="charts-grid">
        {/* Inventory by Location Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Inventory by Location</h3>
              <p>Current distribution of stock across warehouses</p>
            </div>
            <Link to="/locations" className="btn btn-outline btn-sm">
              Manage Locations
            </Link>
          </div>
          <LocationChart data={locationInventory} loading={loading} />
        </div>

        {/* Stock Movement Over Time Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Stock Movement Over Time</h3>
              <p>Daily volume of Stock IN, Stock OUT, and Transfers</p>
            </div>
          </div>
          <MovementChart
            data={movementData.data}
            period={movementPeriod}
            summary={movementData.summary}
            onPeriodChange={handlePeriodChange}
            loading={movementLoading}
          />
        </div>
      </div>

      {/* 3. Tables & Operational Sections */}
      <div className="dashboard-tables-grid">
        {/* Low Stock Section */}
        <div className="dashboard-card-table">
          <div className="card-header">
            <div>
              <div className="card-title">
                <span>⚠️</span>
                <span>Low Stock Products</span>
              </div>
              <p className="card-subtitle">
                Batches currently at or below their respective product reorder levels
              </p>
            </div>
            <Link to="/inventory" className="btn btn-outline btn-sm">
              View Inventory →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="healthy-inventory-state">
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <span>All inventory levels are healthy. No items at or below reorder threshold.</span>
            </div>
          ) : (
            <Table
              headers={['Product', 'SKU', 'Location', 'Current Quantity', 'Reorder Level', 'Status']}
            >
              {lowStockProducts.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.productName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Batch: {item.batchNumber}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.SKU}</span>
                  </td>
                  <td>{item.location}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: item.currentQuantity === 0 ? 'var(--danger-color)' : 'var(--warning-color)' }}>
                      {item.currentQuantity.toLocaleString()}
                    </span>
                  </td>
                  <td>{item.reorderLevel}</td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        {/* Expiring Batches Section */}
        <div className="dashboard-card-table">
          <div className="card-header">
            <div>
              <div className="card-title">
                <span>⏳</span>
                <span>Expiring Soon & Expired</span>
              </div>
              <p className="card-subtitle">
                Batches requiring priority dispatch or disposal attention
              </p>
            </div>
            <Link to="/batches" className="btn btn-outline btn-sm">
              View Batches →
            </Link>
          </div>

          {expiringBatches.length === 0 ? (
            <div style={{ padding: '1.5rem' }}>
              <EmptyState
                icon="🎉"
                title="No batches are expiring soon"
                message="All inventory batches are within their valid shelf life."
              />
            </div>
          ) : (
            <Table
              headers={['Product', 'Batch #', 'Location', 'Quantity', 'Expiry Date', 'Status']}
            >
              {expiringBatches.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.product}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      SKU: {item.SKU}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.batchNumber}</span>
                  </td>
                  <td>{item.location}</td>
                  <td>
                    <strong>{item.quantity.toLocaleString()}</strong>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </td>
                  <td>
                    <Badge status={item.expiryStatus} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        {/* Recent Stock Movements Section */}
        <div className="dashboard-card-table">
          <div className="card-header">
            <div>
              <div className="card-title">
                <span>📜</span>
                <span>Recent Stock Movements</span>
              </div>
              <p className="card-subtitle">
                Latest transactions recorded across all warehouses
              </p>
            </div>
            <Link to="/stock-movements" className="btn btn-outline btn-sm">
              View All →
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <div style={{ padding: '1.5rem' }}>
              <EmptyState
                icon="📦"
                title="No stock movements available"
                message="Stock activity will appear here once intake, issues, or transfers occur."
              />
            </div>
          ) : (
            <Table
              headers={['Product', 'Batch', 'Type', 'Quantity', 'Location', 'User', 'Date']}
            >
              {recentMovements.map((m) => (
                <tr key={m._id}>
                  <td>
                    <strong>{m.product}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.SKU}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{m.batch}</td>
                  <td>
                    <Badge status={m.type} />
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          m.type === 'STOCK_IN'
                            ? 'var(--success-color)'
                            : m.type === 'STOCK_OUT'
                            ? 'var(--danger-color)'
                            : 'var(--warning-color)'
                      }}
                    >
                      {m.type === 'STOCK_IN' ? `+${m.quantity}` : m.type === 'STOCK_OUT' ? `-${m.quantity}` : m.quantity}
                    </span>
                  </td>
                  <td>{m.location}</td>
                  <td>
                    <div>{m.user}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.userRole.toUpperCase()}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(m.date).toLocaleDateString()}
                    <div style={{ fontSize: '0.75rem' }}>
                      {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
