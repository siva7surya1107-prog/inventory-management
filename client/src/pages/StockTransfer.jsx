import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import LoadingSpinner from '../components/LoadingSpinner';

const StockTransfer = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product: '',
    batch: '',
    fromLocation: '',
    toLocation: '',
    quantity: '',
    reason: 'Inter-warehouse transfer',
  });

  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingData(true);
        const [prodRes, locRes] = await Promise.all([
          api.get('/products?limit=200'),
          api.get('/locations?limit=200'),
        ]);
        setProducts(prodRes.data?.data || []);
        setLocations(locRes.data?.data || []);
      } catch (err) {
        toastError('Failed to load products and locations');
      } finally {
        setLoadingData(false);
      }
    };
    fetchInitialData();
  }, [toastError]);

  const handleProductChange = async (productId) => {
    setFormData((prev) => ({
      ...prev,
      product: productId,
      batch: '',
      fromLocation: '',
      toLocation: '',
      quantity: '',
    }));
    setSelectedBatchDetails(null);
    setFormErrors({});

    if (!productId) {
      setBatches([]);
      return;
    }

    try {
      setLoadingBatches(true);
      const res = await api.get(`/batches?product=${productId}&limit=100`);
      setBatches(res.data?.data || []);
    } catch (err) {
      toastError('Failed to load batches for product');
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleBatchChange = (batchId) => {
    const foundBatch = batches.find((b) => b._id === batchId);
    if (foundBatch) {
      setSelectedBatchDetails(foundBatch);
      setFormData((prev) => ({
        ...prev,
        batch: batchId,
        fromLocation: foundBatch.location?._id || foundBatch.location,
      }));
    } else {
      setSelectedBatchDetails(null);
      setFormData((prev) => ({
        ...prev,
        batch: '',
        fromLocation: '',
      }));
    }
    setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!formData.product) errs.product = 'Product is required';
    if (!formData.batch) errs.batch = 'Batch is required';
    if (!formData.fromLocation) errs.fromLocation = 'Source location is required';
    if (!formData.toLocation) errs.toLocation = 'Destination location is required';

    if (formData.fromLocation && formData.toLocation && formData.fromLocation === formData.toLocation) {
      errs.toLocation = 'Source and destination locations cannot be the same';
    }

    const numQty = Number(formData.quantity);
    if (!formData.quantity || isNaN(numQty) || numQty <= 0) {
      errs.quantity = 'Quantity must be greater than 0';
    } else if (selectedBatchDetails && numQty > selectedBatchDetails.quantity) {
      errs.quantity = `Insufficient stock (Available: ${selectedBatchDetails.quantity} units)`;
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await api.post('/stock/transfer', {
        product: formData.product,
        batch: formData.batch,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        quantity: Number(formData.quantity),
        reason: formData.reason,
      });

      success(`Successfully transferred ${formData.quantity} units to destination warehouse!`);

      // Refresh batch quantity
      if (selectedBatchDetails) {
        setSelectedBatchDetails((prev) => ({
          ...prev,
          quantity: prev.quantity - Number(formData.quantity),
        }));
      }

      setFormData((prev) => ({
        ...prev,
        quantity: '',
        toLocation: '',
        reason: 'Inter-warehouse transfer',
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Transfer failed';
      setFormErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return <LoadingSpinner text="Preparing Stock Transfer form..." />;
  }

  return (
    <div className="stock-transfer-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Inter-Warehouse Transfer</h2>
          <p>Relocate product stock batches between warehouse locations atomically</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          ← View Inventory
        </Button>
      </div>

      <Card title="Transfer Shipment Details">
        {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

        <form onSubmit={handleSubmit}>
          <Select
            label="1. Select Product"
            name="product"
            value={formData.product}
            onChange={(e) => handleProductChange(e.target.value)}
            options={products.map((p) => ({ value: p._id, label: `${p.productName} (${p.SKU})` }))}
            error={formErrors.product}
            required
          />

          {formData.product && (
            <>
              {loadingBatches ? (
                <LoadingSpinner size="sm" text="Checking available batches..." />
              ) : batches.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem' }}>
                  <p style={{ color: '#f87171', fontSize: '0.9rem' }}>
                    No batches with stock available for this product.
                  </p>
                </div>
              ) : (
                <Select
                  label="2. Select Source Batch"
                  name="batch"
                  value={formData.batch}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  options={batches.map((b) => ({
                    value: b._id,
                    label: `${b.batchNumber} — Available: ${b.quantity} (Warehouse: ${b.location?.name || 'N/A'})`,
                  }))}
                  error={formErrors.batch}
                  required
                />
              )}
            </>
          )}

          {/* Current Batch Preview */}
          {selectedBatchDetails && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600 }}>SOURCE WAREHOUSE</span>
                <p style={{ fontWeight: 700, marginTop: '2px' }}>{selectedBatchDetails.location?.name}</p>
                <small style={{ color: 'var(--text-muted)' }}>
                  {selectedBatchDetails.location?.city}, {selectedBatchDetails.location?.state}
                </small>
              </div>
              <div>
                <span style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600 }}>SOURCE STOCK LEVEL</span>
                <h3 style={{ color: selectedBatchDetails.quantity === 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  {selectedBatchDetails.quantity} units
                </h3>
              </div>
            </div>
          )}

          <div className="form-row">
            <Select
              label="3. Destination Warehouse"
              name="toLocation"
              value={formData.toLocation}
              onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
              options={locations
                .filter((l) => l._id !== formData.fromLocation)
                .map((l) => ({ value: l._id, label: `${l.name} (${l.city}, ${l.state})` }))}
              error={formErrors.toLocation}
              disabled={!formData.batch}
              required
            />

            <Input
              label="4. Quantity to Transfer"
              name="quantity"
              type="number"
              min="1"
              max={selectedBatchDetails ? selectedBatchDetails.quantity : undefined}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g. 25"
              error={formErrors.quantity}
              disabled={!formData.batch}
              required
            />
          </div>

          <Input
            label="Transfer Notes / Reference"
            name="reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g. Regional store replenishment"
            disabled={!formData.batch}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={!formData.batch || (selectedBatchDetails && selectedBatchDetails.quantity === 0)}
            >
              Execute Stock Transfer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockTransfer;
