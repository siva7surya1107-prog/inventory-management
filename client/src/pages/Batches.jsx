import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Select from '../components/Select';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';

const Batches = () => {
  const { error: toastError } = useToast();

  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filters
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState('');

  // View Modal
  const [viewBatch, setViewBatch] = useState(null);

  const fetchFilterOptions = async () => {
    try {
      const [prodRes, locRes, supRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/locations?limit=100'),
        api.get('/suppliers?limit=100'),
      ]);
      setProducts(prodRes.data?.data || []);
      setLocations(locRes.data?.data || []);
      setSuppliers(supRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (batchSearch) params.append('batchNumber', batchSearch);
      if (selectedProduct) params.append('product', selectedProduct);
      if (selectedLocation) params.append('location', selectedLocation);
      if (selectedSupplier) params.append('supplier', selectedSupplier);
      if (selectedExpiry) params.append('expiryStatus', selectedExpiry);

      const res = await api.get(`/batches?${params.toString()}`);
      setBatches(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  }, [page, batchSearch, selectedProduct, selectedLocation, selectedSupplier, selectedExpiry, toastError]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const getExpiryHighlight = (expDateStr) => {
    if (!expDateStr) return { label: 'Unknown', variant: 'default' };
    const expDate = new Date(expDateStr);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (expDate < now) {
      return { label: 'EXPIRED', variant: 'danger' };
    }
    if (expDate <= thirtyDaysFromNow) {
      return { label: 'EXPIRING SOON', variant: 'warning' };
    }
    return { label: 'VALID', variant: 'success' };
  };

  return (
    <div className="batches-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Product Batches & Traceability</h2>
          <p>Monitor manufacturing dates, expiry timelines, and batch distributions</p>
        </div>
      </div>

      <Card>
        {/* Multi-filter Toolbar */}
        <div className="filter-row">
          <SearchBar
            value={batchSearch}
            onChange={(val) => {
              setBatchSearch(val);
              setPage(1);
            }}
            placeholder="Search by batch number..."
          />

          <div style={{ minWidth: '160px' }}>
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

          <div style={{ minWidth: '150px' }}>
            <Select
              placeholder="All Warehouses"
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setPage(1);
              }}
              options={locations.map((l) => ({ value: l._id, label: l.name }))}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <Select
              placeholder="All Suppliers"
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setPage(1);
              }}
              options={suppliers.map((s) => ({ value: s._id, label: s.companyName || s.name }))}
            />
          </div>

          <div style={{ minWidth: '140px' }}>
            <Select
              placeholder="Expiry Status"
              value={selectedExpiry}
              onChange={(e) => {
                setSelectedExpiry(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'expired', label: 'Expired' },
                { value: 'expiring_soon', label: 'Expiring Soon (≤30d)' },
                { value: 'valid', label: 'Valid (>30d)' },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading batches..." />
        ) : batches.length === 0 ? (
          <EmptyState
            icon="🔢"
            title="No batches found"
            message="No batch records match your active search filters."
          />
        ) : (
          <>
            <Table
              headers={[
                'Batch Number',
                'Product',
                'Warehouse Location',
                'Current Quantity',
                'Supplier',
                'Manufacturing Date',
                'Expiry Date',
                'Status',
                'Actions',
              ]}
            >
              {batches.map((batch) => {
                const expiryInfo = getExpiryHighlight(batch.expiryDate);
                return (
                  <tr key={batch._id}>
                    <td>
                      <strong>{batch.batchNumber}</strong>
                    </td>
                    <td>
                      {batch.product?.productName || 'Unknown'}
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{batch.product?.SKU}</small>
                    </td>
                    <td>{batch.location?.name || 'Unassigned'}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }}>{batch.quantity} units</strong>
                    </td>
                    <td>{batch.supplier?.companyName || batch.supplier?.name || '—'}</td>
                    <td>{new Date(batch.manufacturingDate).toLocaleDateString()}</td>
                    <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={expiryInfo.variant}>{expiryInfo.label}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewBatch(batch)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
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

      {/* Batch Details Modal */}
      <Modal
        isOpen={!!viewBatch}
        onClose={() => setViewBatch(null)}
        title={`Batch Details: ${viewBatch?.batchNumber}`}
        size="md"
      >
        {viewBatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-row">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Product</span>
                <h4>{viewBatch.product?.productName}</h4>
                <small style={{ color: 'var(--text-secondary)' }}>SKU: {viewBatch.product?.SKU}</small>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Stock Quantity</span>
                <h3 style={{ color: viewBatch.quantity === 0 ? '#ef4444' : '#10b981' }}>
                  {viewBatch.quantity} units
                </h3>
              </div>
            </div>

            <div className="form-row">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Warehouse Location</span>
                <p>{viewBatch.location?.name}</p>
                <small style={{ color: 'var(--text-muted)' }}>
                  {viewBatch.location?.city}, {viewBatch.location?.state}
                </small>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Supplier</span>
                <p>{viewBatch.supplier?.companyName || viewBatch.supplier?.name}</p>
              </div>
            </div>

            <div className="form-row">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Manufacturing Date</span>
                <p>{new Date(viewBatch.manufacturingDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Expiry Date</span>
                <p>{new Date(viewBatch.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <small style={{ color: '#93c5fd' }}>
                ℹ Batch quantities are immutable via direct edits and can only be altered through stock intake, stock issue, or inter-warehouse transfers.
              </small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setViewBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Batches;
