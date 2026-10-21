import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Card from '../components/Card';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { exportToCsv } from '../utils/csvExport';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(true);

  // Common dropdown options
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // Tab 1: Inventory Report State
  const [invData, setInvData] = useState([]);
  const [invPagination, setInvPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [invFilters, setInvFilters] = useState({
    search: '',
    category: '',
    location: '',
    status: ''
  });

  // Tab 2: Low Stock Report State
  const [lowStockData, setLowStockData] = useState([]);

  // Tab 3: Out of Stock Report State
  const [outStockData, setOutStockData] = useState([]);

  // Tab 4: Expiry Report State
  const [expiryData, setExpiryData] = useState([]);
  const [expiryFilter, setExpiryFilter] = useState(''); // '', 'EXPIRED', 'EXPIRING_SOON'

  // Tab 5: Stock Movement Report State
  const [movData, setMovData] = useState([]);
  const [movPagination, setMovPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [movFilters, setMovFilters] = useState({
    search: '',
    type: '',
    location: '',
    startDate: '',
    endDate: ''
  });

  // Tab 6: Location Inventory Report State
  const [locReportData, setLocReportData] = useState([]);
  const [expandedLocId, setExpandedLocId] = useState(null);

  // Load dropdown lists on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, locRes] = await Promise.all([
          api.get('/categories?limit=100'),
          api.get('/locations?limit=100')
        ]);
        if (catRes.data?.success) setCategories(catRes.data.data);
        if (locRes.data?.success) setLocations(locRes.data.data);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchMetadata();
  }, []);

  // 1. Fetch Inventory Report
  const fetchInventoryReport = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: invPagination.limit,
        ...(invFilters.search && { search: invFilters.search }),
        ...(invFilters.category && { category: invFilters.category }),
        ...(invFilters.location && { location: invFilters.location }),
        ...(invFilters.status && { status: invFilters.status })
      };
      const res = await api.get('/reports/inventory', { params });
      if (res.data?.success) {
        setInvData(res.data.data);
        if (res.data.pagination) setInvPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load inventory report:', err);
    } finally {
      setLoading(false);
    }
  }, [invFilters, invPagination.limit]);

  // 2. Fetch Low Stock Report
  const fetchLowStockReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/low-stock');
      if (res.data?.success) {
        setLowStockData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load low stock report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Fetch Out of Stock Report
  const fetchOutOfStockReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/out-of-stock');
      if (res.data?.success) {
        setOutStockData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load out of stock report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Fetch Expiry Report
  const fetchExpiryReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = expiryFilter ? { status: expiryFilter } : {};
      const res = await api.get('/reports/expiry', { params });
      if (res.data?.success) {
        setExpiryData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load expiry report:', err);
    } finally {
      setLoading(false);
    }
  }, [expiryFilter]);

  // 5. Fetch Stock Movements Report
  const fetchMovementReport = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: movPagination.limit,
        ...(movFilters.search && { search: movFilters.search }),
        ...(movFilters.type && { type: movFilters.type }),
        ...(movFilters.location && { location: movFilters.location }),
        ...(movFilters.startDate && { startDate: movFilters.startDate }),
        ...(movFilters.endDate && { endDate: movFilters.endDate })
      };
      const res = await api.get('/reports/stock-movements', { params });
      if (res.data?.success) {
        setMovData(res.data.data);
        if (res.data.pagination) setMovPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load movement report:', err);
    } finally {
      setLoading(false);
    }
  }, [movFilters, movPagination.limit]);

  // 6. Fetch Location Inventory Report
  const fetchLocationReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/location-inventory');
      if (res.data?.success) {
        setLocReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load location report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dispatch fetch based on active tab
  useEffect(() => {
    if (activeTab === 'inventory') fetchInventoryReport(1);
    else if (activeTab === 'low-stock') fetchLowStockReport();
    else if (activeTab === 'out-of-stock') fetchOutOfStockReport();
    else if (activeTab === 'expiry') fetchExpiryReport();
    else if (activeTab === 'movements') fetchMovementReport(1);
    else if (activeTab === 'location') fetchLocationReport();
  }, [
    activeTab,
    fetchInventoryReport,
    fetchLowStockReport,
    fetchOutOfStockReport,
    fetchExpiryReport,
    fetchMovementReport,
    fetchLocationReport
  ]);

  // --- CSV Export Handlers ---

  const handleExportInventoryCSV = async () => {
    try {
      const params = {
        export: 'true',
        ...(invFilters.search && { search: invFilters.search }),
        ...(invFilters.category && { category: invFilters.category }),
        ...(invFilters.location && { location: invFilters.location }),
        ...(invFilters.status && { status: invFilters.status })
      };
      const res = await api.get('/reports/inventory', { params });
      const rows = res.data?.data || [];

      const columns = [
        { label: 'Product Name', key: 'product' },
        { label: 'SKU', key: 'SKU' },
        { label: 'Category', key: 'category' },
        { label: 'Batch Number', key: 'batchNumber' },
        { label: 'Location', key: 'location' },
        { label: 'Quantity', key: 'quantity' },
        { label: 'Reorder Level', key: 'reorderLevel' },
        { label: 'Status', key: 'status' },
        { label: 'Expiry Date', key: (r) => (r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'N/A') }
      ];

      exportToCsv('inventory-report.csv', columns, rows);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export.');
    }
  };

  const handleExportLowStockCSV = () => {
    const columns = [
      { label: 'Product Name', key: 'product' },
      { label: 'SKU', key: 'SKU' },
      { label: 'Category', key: 'category' },
      { label: 'Batch Number', key: 'batchNumber' },
      { label: 'Location', key: 'location' },
      { label: 'Current Quantity', key: 'currentQuantity' },
      { label: 'Reorder Level', key: 'reorderLevel' },
      { label: 'Difference (Deficit)', key: 'difference' },
      { label: 'Status', key: 'status' }
    ];
    exportToCsv('low-stock-report.csv', columns, lowStockData);
  };

  const handleExportOutOfStockCSV = () => {
    const columns = [
      { label: 'Product Name', key: 'product' },
      { label: 'SKU', key: 'SKU' },
      { label: 'Category', key: 'category' },
      { label: 'Batch Number', key: 'batchNumber' },
      { label: 'Location', key: 'location' },
      { label: 'Reorder Level', key: 'reorderLevel' },
      { label: 'Status', key: 'status' }
    ];
    exportToCsv('out-of-stock-report.csv', columns, outStockData);
  };

  const handleExportExpiryCSV = () => {
    const columns = [
      { label: 'Product Name', key: 'product' },
      { label: 'SKU', key: 'SKU' },
      { label: 'Batch Number', key: 'batchNumber' },
      { label: 'Location', key: 'location' },
      { label: 'Quantity', key: 'quantity' },
      { label: 'Manufacturing Date', key: (r) => (r.manufacturingDate ? new Date(r.manufacturingDate).toLocaleDateString() : 'N/A') },
      { label: 'Expiry Date', key: (r) => (r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'N/A') },
      { label: 'Expiry Status', key: 'expiryStatus' }
    ];
    exportToCsv('expiry-report.csv', columns, expiryData);
  };

  const handleExportMovementsCSV = async () => {
    try {
      const params = {
        export: 'true',
        ...(movFilters.search && { search: movFilters.search }),
        ...(movFilters.type && { type: movFilters.type }),
        ...(movFilters.location && { location: movFilters.location }),
        ...(movFilters.startDate && { startDate: movFilters.startDate }),
        ...(movFilters.endDate && { endDate: movFilters.endDate })
      };
      const res = await api.get('/reports/stock-movements', { params });
      const rows = res.data?.data || [];

      const columns = [
        { label: 'Date & Time', key: (r) => new Date(r.date).toLocaleString() },
        { label: 'Product Name', key: 'product' },
        { label: 'SKU', key: 'SKU' },
        { label: 'Batch', key: 'batch' },
        { label: 'Movement Type', key: 'type' },
        { label: 'Quantity', key: 'quantity' },
        { label: 'From Location', key: 'fromLocation' },
        { label: 'To Location', key: 'toLocation' },
        { label: 'User', key: 'user' },
        { label: 'Role', key: 'userRole' },
        { label: 'Reason / Notes', key: 'reason' }
      ];

      exportToCsv('stock-movement-report.csv', columns, rows);
    } catch (err) {
      console.error('Failed to export movements CSV:', err);
      alert('Failed to generate CSV export.');
    }
  };

  const handleExportLocationCSV = () => {
    const columns = [
      { label: 'Warehouse / Location', key: 'location' },
      { label: 'City', key: 'city' },
      { label: 'State', key: 'state' },
      { label: 'Status', key: 'status' },
      { label: 'Total Products', key: 'totalProducts' },
      { label: 'Total Stock Quantity', key: 'totalQuantity' },
      { label: 'Low Stock Batches', key: 'lowStockItems' },
      { label: 'Out of Stock Batches', key: 'outOfStockItems' }
    ];
    exportToCsv('location-inventory-report.csv', columns, locReportData);
  };

  return (
    <div className="reports-page">
      {/* Page Title */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Inventory & Operational Reports</h1>
          <p>Exportable reports, stock audits, warehouse valuations, and lifecycle tracking</p>
        </div>
      </div>

      {/* Report Tabs Navigation */}
      <div className="report-tabs-bar">
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📋 Inventory Report
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'low-stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('low-stock')}
        >
          ⚠️ Low Stock Report
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'out-of-stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('out-of-stock')}
        >
          🚫 Out of Stock Report
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'expiry' ? 'active' : ''}`}
          onClick={() => setActiveTab('expiry')}
        >
          ⏳ Expiry Report
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          📜 Stock Movements Report
        </button>
        <button
          type="button"
          className={`report-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          🏢 Location Inventory
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: INVENTORY REPORT */}
      {/* ============================================================== */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div className="report-filters-grid">
              <Input
                label="Search"
                placeholder="Product, SKU, batch, location..."
                value={invFilters.search}
                onChange={(e) => setInvFilters({ ...invFilters, search: e.target.value })}
              />

              <Select
                label="Category"
                value={invFilters.category}
                onChange={(e) => setInvFilters({ ...invFilters, category: e.target.value })}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c._id, label: c.name }))
                ]}
              />

              <Select
                label="Location"
                value={invFilters.location}
                onChange={(e) => setInvFilters({ ...invFilters, location: e.target.value })}
                options={[
                  { value: '', label: 'All Locations' },
                  ...locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))
                ]}
              />

              <Select
                label="Stock Status"
                value={invFilters.status}
                onChange={(e) => setInvFilters({ ...invFilters, status: e.target.value })}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'IN_STOCK', label: 'In Stock' },
                  { value: 'LOW_STOCK', label: 'Low Stock' },
                  { value: 'OUT_OF_STOCK', label: 'Out of Stock' }
                ]}
              />

              <div className="report-actions-row">
                <Button variant="primary" onClick={() => fetchInventoryReport(1)}>
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInvFilters({ search: '', category: '', location: '', status: '' });
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <button type="button" className="btn-csv" onClick={handleExportInventoryCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Generating Inventory Report..." />
            ) : invData.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No inventory records found"
                message="No batches matched the chosen search parameters or no items exist."
              />
            ) : (
              <>
                <Table
                  headers={[
                    'Product',
                    'SKU',
                    'Category',
                    'Batch #',
                    'Location',
                    'Quantity',
                    'Reorder Level',
                    'Status',
                    'Expiry Date'
                  ]}
                >
                  {invData.map((row) => (
                    <tr key={row._id}>
                      <td>
                        <strong>{row.product}</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace' }}>{row.SKU}</span>
                      </td>
                      <td>{row.category}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.batchNumber}</td>
                      <td>{row.location}</td>
                      <td>
                        <strong>{row.quantity.toLocaleString()}</strong>
                      </td>
                      <td>{row.reorderLevel}</td>
                      <td>
                        <Badge status={row.status} />
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>

                <Pagination
                  currentPage={invPagination.page}
                  totalPages={invPagination.pages}
                  totalItems={invPagination.total}
                  onPageChange={(page) => fetchInventoryReport(page)}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LOW STOCK REPORT */}
      {/* ============================================================== */}
      {activeTab === 'low-stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Low Stock Deficit Report</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Batches with remaining inventory strictly at or below their assigned reorder levels
              </p>
            </div>
            <button type="button" className="btn-csv" onClick={handleExportLowStockCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Calculating stock deficits..." />
            ) : lowStockData.length === 0 ? (
              <div className="healthy-inventory-state">
                <span style={{ fontSize: '1.25rem' }}>✓</span>
                <span>All inventory levels are healthy! No items are currently in low stock deficit.</span>
              </div>
            ) : (
              <Table
                headers={[
                  'Product',
                  'SKU',
                  'Category',
                  'Location',
                  'Batch #',
                  'Current Quantity',
                  'Reorder Level',
                  'Deficit (Difference)',
                  'Status'
                ]}
              >
                {lowStockData.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.product}</strong>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.SKU}</td>
                    <td>{row.category}</td>
                    <td>{row.location}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.batchNumber}</td>
                    <td>
                      <strong style={{ color: 'var(--warning-color)' }}>
                        {row.currentQuantity}
                      </strong>
                    </td>
                    <td>{row.reorderLevel}</td>
                    <td>
                      <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>
                        -{row.difference} units
                      </span>
                    </td>
                    <td>
                      <Badge status="LOW_STOCK" />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: OUT OF STOCK REPORT */}
      {/* ============================================================== */}
      {activeTab === 'out-of-stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Depleted Stock (Out of Stock)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Batches where current quantity has reached 0 and require immediate replenishment
              </p>
            </div>
            <button type="button" className="btn-csv" onClick={handleExportOutOfStockCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Scanning for depleted batches..." />
            ) : outStockData.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="Zero Out-of-Stock Items"
                message="Every monitored batch currently has positive available inventory."
              />
            ) : (
              <Table headers={['Product', 'SKU', 'Category', 'Batch #', 'Location', 'Reorder Level', 'Status']}>
                {outStockData.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.product}</strong>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.SKU}</td>
                    <td>{row.category}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.batchNumber}</td>
                    <td>{row.location}</td>
                    <td>{row.reorderLevel}</td>
                    <td>
                      <Badge status="OUT_OF_STOCK" />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: EXPIRY REPORT */}
      {/* ============================================================== */}
      {activeTab === 'expiry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                label="Expiry Status Filter"
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value)}
                options={[
                  { value: '', label: 'All (Expired & Expiring Soon)' },
                  { value: 'EXPIRED', label: 'Expired Only' },
                  { value: 'EXPIRING_SOON', label: 'Expiring Soon Only' }
                ]}
              />
              <div style={{ marginTop: '1.5rem' }}>
                <Button variant="outline" onClick={fetchExpiryReport}>
                  Refresh
                </Button>
              </div>
            </div>

            <button type="button" className="btn-csv" onClick={handleExportExpiryCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Auditing batch shelf life..." />
            ) : expiryData.length === 0 ? (
              <EmptyState
                icon="⏳"
                title="No batches expiring soon or expired"
                message="All inventory batches are comfortably within their valid expiration dates."
              />
            ) : (
              <Table
                headers={[
                  'Product',
                  'SKU',
                  'Batch #',
                  'Location',
                  'Quantity',
                  'Manufacturing Date',
                  'Expiry Date',
                  'Status'
                ]}
              >
                {expiryData.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.product}</strong>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.SKU}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.batchNumber}</td>
                    <td>{row.location}</td>
                    <td>
                      <strong>{row.quantity.toLocaleString()}</strong>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {row.manufacturingDate ? new Date(row.manufacturingDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <Badge status={row.expiryStatus} />
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: STOCK MOVEMENT REPORT */}
      {/* ============================================================== */}
      {activeTab === 'movements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div className="report-filters-grid">
              <Input
                label="Search"
                placeholder="Product, SKU, user, reason..."
                value={movFilters.search}
                onChange={(e) => setMovFilters({ ...movFilters, search: e.target.value })}
              />

              <Select
                label="Movement Type"
                value={movFilters.type}
                onChange={(e) => setMovFilters({ ...movFilters, type: e.target.value })}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'STOCK_IN', label: 'Stock IN' },
                  { value: 'STOCK_OUT', label: 'Stock OUT' },
                  { value: 'TRANSFER', label: 'Transfer' }
                ]}
              />

              <Select
                label="Location"
                value={movFilters.location}
                onChange={(e) => setMovFilters({ ...movFilters, location: e.target.value })}
                options={[
                  { value: '', label: 'All Locations' },
                  ...locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))
                ]}
              />

              <Input
                label="Start Date"
                type="date"
                value={movFilters.startDate}
                onChange={(e) => setMovFilters({ ...movFilters, startDate: e.target.value })}
              />

              <Input
                label="End Date"
                type="date"
                value={movFilters.endDate}
                onChange={(e) => setMovFilters({ ...movFilters, endDate: e.target.value })}
              />

              <div className="report-actions-row">
                <Button variant="primary" onClick={() => fetchMovementReport(1)}>
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMovFilters({ search: '', type: '', location: '', startDate: '', endDate: '' });
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <button type="button" className="btn-csv" onClick={handleExportMovementsCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Fetching audit movements..." />
            ) : movData.length === 0 ? (
              <EmptyState
                icon="📜"
                title="No stock movements found"
                message="No transaction records match the specified filters."
              />
            ) : (
              <>
                <Table
                  headers={[
                    'Date & Time',
                    'Product',
                    'SKU',
                    'Batch #',
                    'Type',
                    'Quantity',
                    'From Location',
                    'To Location',
                    'User',
                    'Reason'
                  ]}
                >
                  {movData.map((row) => (
                    <tr key={row._id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(row.date).toLocaleDateString()}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <strong>{row.product}</strong>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{row.SKU}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.batch}</td>
                      <td>
                        <Badge status={row.type} />
                      </td>
                      <td>
                        <strong
                          style={{
                            color:
                              row.type === 'STOCK_IN'
                                ? 'var(--success-color)'
                                : row.type === 'STOCK_OUT'
                                ? 'var(--danger-color)'
                                : 'var(--warning-color)'
                          }}
                        >
                          {row.type === 'STOCK_IN' ? `+${row.quantity}` : row.type === 'STOCK_OUT' ? `-${row.quantity}` : row.quantity}
                        </strong>
                      </td>
                      <td>{row.fromLocation}</td>
                      <td>{row.toLocation}</td>
                      <td>
                        <div>{row.user}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {row.userRole.toUpperCase()}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{row.reason}</td>
                    </tr>
                  ))}
                </Table>

                <Pagination
                  currentPage={movPagination.page}
                  totalPages={movPagination.pages}
                  totalItems={movPagination.total}
                  onPageChange={(page) => fetchMovementReport(page)}
                />
              </>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: LOCATION INVENTORY REPORT */}
      {/* ============================================================== */}
      {activeTab === 'location' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="report-controls-bar">
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Multi-Warehouse Inventory Report</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Stock aggregated across all physical warehouses, distribution hubs, and retail outlets
              </p>
            </div>
            <button type="button" className="btn-csv" onClick={handleExportLocationCSV}>
              📥 Export CSV
            </button>
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Aggregating warehouse distribution..." />
            ) : locReportData.length === 0 ? (
              <EmptyState
                icon="🏢"
                title="No locations configured"
                message="Add warehouse locations in the Locations tab to monitor spatial inventory."
              />
            ) : (
              <Table
                headers={[
                  'Location',
                  'City / State',
                  'Status',
                  'Total Products',
                  'Total Quantity',
                  'Low Stock Batches',
                  'Out of Stock Batches',
                  'Action'
                ]}
              >
                {locReportData.map((loc) => {
                  const isExpanded = expandedLocId === loc.locationId;
                  return (
                    <React.Fragment key={loc.locationId}>
                      <tr>
                        <td>
                          <strong>{loc.location}</strong>
                        </td>
                        <td>
                          {loc.city}, {loc.state}
                        </td>
                        <td>
                          <Badge status={loc.status === 'active' ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{loc.totalProducts}</span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {loc.totalQuantity.toLocaleString()} units
                          </strong>
                        </td>
                        <td>
                          <span style={{ color: loc.lowStockItems > 0 ? 'var(--warning-color)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {loc.lowStockItems}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: loc.outOfStockItems > 0 ? 'var(--danger-color)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {loc.outOfStockItems}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedLocId(isExpanded ? null : loc.locationId)}
                          >
                            {isExpanded ? 'Hide Items' : 'View Items'}
                          </Button>
                        </td>
                      </tr>

                      {/* Expandable Product Breakdown Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ background: 'var(--bg-secondary)', padding: '1rem 1.5rem' }}>
                            <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              📦 Products at {loc.location}:
                            </div>
                            {loc.products.length === 0 ? (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No active products currently stored in this warehouse.
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                                {loc.products.map((p) => (
                                  <div
                                    key={p.productId}
                                    style={{
                                      padding: '0.65rem 0.85rem',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-md)'
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.productName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      SKU: {p.SKU}
                                    </div>
                                    <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                      <span>Stock: <strong>{p.totalQuantity}</strong></span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{p.batchesCount} batch(es)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;
