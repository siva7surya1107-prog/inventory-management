import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import Card from '../components/Card';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filter options lists
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  // Active filters
  const [filters, setFilters] = useState({
    product: '',
    location: '',
    type: '',
    startDate: '',
    endDate: ''
  });

  const { showToast } = useToast();

  // Load dropdown choices on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [prodRes, locRes] = await Promise.all([
          api.get('/products?limit=100'),
          api.get('/locations?limit=100')
        ]);
        if (prodRes.data.success) {
          setProducts(prodRes.data.data);
        }
        if (locRes.data.success) {
          setLocations(locRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };

    fetchDropdownData();
  }, []);

  // Fetch movements
  const fetchMovements = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit
      };

      if (filters.product) params.product = filters.product;
      if (filters.location) params.location = filters.location;
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await api.get('/stock/movements', { params });
      if (res.data.success) {
        setMovements(res.data.data || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to fetch stock movements', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, showToast]);

  useEffect(() => {
    fetchMovements(1);
  }, [fetchMovements]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      product: '',
      location: '',
      type: '',
      startDate: '',
      endDate: ''
    });
  };

  const formatQuantity = (type, qty) => {
    if (type === 'STOCK_IN') {
      return <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>+{qty}</span>;
    }
    if (type === 'STOCK_OUT') {
      return <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>-{qty}</span>;
    }
    return <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>{qty}</span>;
  };

  const columns = [
    {
      header: 'Type',
      render: (m) => <Badge status={m.type} />
    },
    {
      header: 'Product',
      render: (m) => (
        <div>
          <div style={{ fontWeight: 600 }}>{m.product?.productName || 'Unknown Product'}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            SKU: {m.product?.SKU || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Batch #',
      render: (m) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
          {m.batch?.batchNumber || '—'}
        </span>
      )
    },
    {
      header: 'Quantity',
      render: (m) => formatQuantity(m.type, m.quantity)
    },
    {
      header: 'From',
      render: (m) => (
        <span>
          {m.fromLocation ? `${m.fromLocation.name} (${m.fromLocation.city || ''})` : '—'}
        </span>
      )
    },
    {
      header: 'To',
      render: (m) => (
        <span>
          {m.toLocation ? `${m.toLocation.name} (${m.toLocation.city || ''})` : '—'}
        </span>
      )
    },
    {
      header: 'User',
      render: (m) => (
        <div>
          <div>{m.user?.name || 'System'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {m.user?.role ? m.user.role.toUpperCase() : ''}
          </div>
        </div>
      )
    },
    {
      header: 'Reason / Notes',
      render: (m) => (
        <span style={{ maxWidth: '180px', display: 'inline-block', wordBreak: 'break-word' }}>
          {m.reason || '—'}
        </span>
      )
    },
    {
      header: 'Date & Time',
      render: (m) => (
        <div style={{ fontSize: '0.85rem' }}>
          {new Date(m.createdAt).toLocaleDateString()}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="stock-movements-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Stock Movements Audit Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Comprehensive chronological history of all inventory intake, dispatch, and transfers.
          </p>
        </div>
        <Button variant="secondary" onClick={() => fetchMovements(pagination.page)}>
          🔄 Refresh
        </Button>
      </div>

      {/* Filter Card */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <Select
            label="Movement Type"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Movement Types' },
              { value: 'STOCK_IN', label: 'Stock IN' },
              { value: 'STOCK_OUT', label: 'Stock OUT' },
              { value: 'TRANSFER', label: 'Transfer' }
            ]}
          />

          <Select
            label="Product"
            name="product"
            value={filters.product}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Products' },
              ...products.map((p) => ({ value: p._id, label: `${p.productName} (${p.SKU})` }))
            ]}
          />

          <Select
            label="Location"
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Locations' },
              ...locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))
            ]}
          />

          <Input
            label="Start Date"
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />

          <Input
            label="End Date"
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <Button
              variant="outline"
              onClick={handleResetFilters}
              style={{ width: '100%' }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Table & Content */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Loading movement records..." />
        ) : movements.length === 0 ? (
          <EmptyState
            title="No Stock Movements Found"
            message="No movement events match the selected filters or no stock transactions have been performed yet."
          />
        ) : (
          <>
            <Table columns={columns} data={movements} />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              onPageChange={(page) => fetchMovements(page)}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default StockMovements;
