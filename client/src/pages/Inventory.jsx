import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Table from '../components/Table';
import Select from '../components/Select';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';

const Inventory = () => {
  const { error: toastError } = useToast();

  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchFilters = async () => {
    try {
      const [prodRes, locRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/locations?limit=100'),
      ]);
      setProducts(prodRes.data?.data || []);
      setLocations(locRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load inventory filters:', err);
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      if (selectedProduct) params.append('product', selectedProduct);
      if (selectedLocation) params.append('location', selectedLocation);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/inventory?${params.toString()}`);
      setInventory(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedProduct, selectedLocation, selectedStatus, toastError]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <div className="inventory-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Warehouse Stock Inventory</h2>
          <p>Real-time inventory levels, dynamic stock alerts, and warehouse distribution</p>
        </div>
      </div>

      <Card>
        {/* Filters Toolbar */}
        <div className="filter-row">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by product, SKU, or batch..."
          />

          <div style={{ minWidth: '180px' }}>
            <Select
              placeholder="All Products"
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setPage(1);
              }}
              options={products.map((p) => ({ value: p._id, label: `${p.productName} (${p.SKU})` }))}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <Select
              placeholder="All Locations"
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPage(1);
              }}
              options={locations.map((l) => ({ value: l._id, label: l.name }))}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <Select
              placeholder="All Statuses"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'IN_STOCK', label: 'In Stock' },
                { value: 'LOW_STOCK', label: 'Low Stock Alert' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading inventory levels..." />
        ) : inventory.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No inventory available"
            message="No stock inventory matches your selected filters. Perform a Stock In to add items."
          />
        ) : (
          <>
            <Table
              headers={[
                'Product',
                'SKU',
                'Batch Number',
                'Location / Warehouse',
                'Quantity',
                'Reorder Level',
                'Expiry Date',
                'Status',
              ]}
            >
              {inventory.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.product?.productName || 'Unknown Product'}</strong>
                  </td>
                  <td>
                    <code>{item.SKU}</code>
                  </td>
                  <td>
                    <strong>{item.batchNumber}</strong>
                  </td>
                  <td>{item.location?.name || 'Unassigned'}</td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: item.quantity === 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {item.quantity}
                    </strong>
                  </td>
                  <td>{item.reorderLevel} units</td>
                  <td>
                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <Badge status={item.status}>{item.status.replace(/_/g, ' ')}</Badge>
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default Inventory;
