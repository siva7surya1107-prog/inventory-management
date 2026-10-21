import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import LoadingSpinner from '../components/LoadingSpinner';

const StockOut = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product: '',
    batch: '',
    location: '',
    quantity: '',
    reason: 'Customer order',
  });

  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // 1. Load products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.get('/products?limit=200');
        const prodList = res.data?.data || [];
        setProducts(prodList);
      } catch (err) {
        toastError('Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [toastError]);

  // 2. When product selection changes, load available batches for that product
  const handleProductChange = async (productId) => {
    setFormData((prev) => ({
      ...prev,
      product: productId,
      batch: '',
      location: '',
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
      const batchList = res.data?.data || [];
      setBatches(batchList);
    } catch (err) {
      toastError('Failed to load batches for selected product');
    } finally {
      setLoadingBatches(false);
    }
  };

  // 3. When batch selection changes, capture location and available stock
  const handleBatchChange = (batchId) => {
    const foundBatch = batches.find((b) => b._id === batchId);
    if (foundBatch) {
      setSelectedBatchDetails(foundBatch);
      setFormData((prev) => ({
        ...prev,
        batch: batchId,
        location: foundBatch.location?._id || foundBatch.location,
      }));
    } else {
      setSelectedBatchDetails(null);
      setFormData((prev) => ({
        ...prev,
        batch: '',
        location: '',
      }));
    }
    setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!formData.product) errs.product = 'Product is required';
    if (!formData.batch) errs.batch = 'Batch is required';
    if (!formData.location) errs.location = 'Location is required';

    const numQty = Number(formData.quantity);
    if (!formData.quantity || isNaN(numQty) || numQty <= 0) {
      errs.quantity = 'Quantity must be a number greater than 0';
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
      await api.post('/stock/out', {
        product: formData.product,
        batch: formData.batch,
        location: formData.location,
        quantity: Number(formData.quantity),
        reason: formData.reason,
      });

      success(`Successfully issued ${formData.quantity} units!`);

      // Refresh remaining batch stock
      if (selectedBatchDetails) {
        setSelectedBatchDetails((prev) => ({
          ...prev,
          quantity: prev.quantity - Number(formData.quantity),
        }));
      }

      setFormData((prev) => ({ ...prev, quantity: '', reason: 'Customer order' }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Stock Out failed';
      setFormErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProducts) {
    return <LoadingSpinner text="Preparing Stock Out form..." />;
  }

  return (
    <div className="stock-out-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Stock Outflow (Issue)</h2>
          <p>Remove stock for customer fulfillment, dispatch, or internal usage</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          ← View Inventory
        </Button>
      </div>

      <Card title="Issue Shipment Details">
        {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

        <form onSubmit={handleSubmit}>
          <Select
            label="Select Product to Issue"
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
                    No batches found for this product. You must perform a Stock In before issuing.
                  </p>
                </div>
              ) : (
                <Select
                  label="Select Batch"
                  name="batch"
                  value={formData.batch}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  options={batches.map((b) => ({
                    value: b._id,
                    label: `${b.batchNumber} — Qty: ${b.quantity} (Warehouse: ${b.location?.name || 'N/A'}) [Exp: ${new Date(b.expiryDate).toLocaleDateString()}]`,
                  }))}
                  error={formErrors.batch}
                  required
                />
              )}
            </>
          )}

          {/* Display batch inventory preview */}
          {selectedBatchDetails && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>AVAILABLE STOCK</span>
                <h3 style={{ color: selectedBatchDetails.quantity === 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  {selectedBatchDetails.quantity} units
                </h3>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>WAREHOUSE LOCATION</span>
                <p style={{ fontWeight: 600, marginTop: '2px' }}>{selectedBatchDetails.location?.name}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>EXPIRY DATE</span>
                <p style={{ marginTop: '2px' }}>{new Date(selectedBatchDetails.expiryDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          <div className="form-row">
            <Input
              label="Quantity to Issue"
              name="quantity"
              type="number"
              min="1"
              max={selectedBatchDetails ? selectedBatchDetails.quantity : undefined}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g. 20"
              error={formErrors.quantity}
              disabled={!formData.batch}
              required
            />

            <Input
              label="Reason / Dispatch Order"
              name="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Sales Order #SO-4291"
              disabled={!formData.batch}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Button
              type="submit"
              variant="danger"
              size="md"
              loading={submitting}
              disabled={!formData.batch || (selectedBatchDetails && selectedBatchDetails.quantity === 0)}
            >
              Confirm Stock Issue
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockOut;
