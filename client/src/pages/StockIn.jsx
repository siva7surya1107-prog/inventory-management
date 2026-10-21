import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import LoadingSpinner from '../components/LoadingSpinner';

const StockIn = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product: '',
    batchNumber: '',
    supplier: '',
    location: '',
    quantity: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    reason: 'Initial stock intake',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const [prodRes, supRes, locRes] = await Promise.all([
          api.get('/products?limit=200'),
          api.get('/suppliers?limit=200'),
          api.get('/locations?limit=200'),
        ]);

        const prodList = prodRes.data?.data || [];
        const supList = supRes.data?.data || [];
        const locList = locRes.data?.data || [];

        setProducts(prodList);
        setSuppliers(supList);
        setLocations(locList);

        if (prodList.length > 0 && !formData.product) {
          setFormData((prev) => ({
            ...prev,
            product: prodList[0]._id,
            supplier: supList[0]?._id || '',
            location: locList[0]?._id || '',
          }));
        }
      } catch (err) {
        toastError('Failed to load form options');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [toastError]);

  const validate = () => {
    const errs = {};
    if (!formData.product) errs.product = 'Product is required';
    if (!formData.batchNumber.trim()) errs.batchNumber = 'Batch number is required';
    if (!formData.supplier) errs.supplier = 'Supplier is required';
    if (!formData.location) errs.location = 'Destination warehouse location is required';
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      errs.quantity = 'Quantity must be greater than 0';
    }
    if (!formData.manufacturingDate) errs.manufacturingDate = 'Manufacturing date is required';
    if (!formData.expiryDate) errs.expiryDate = 'Expiry date is required';
    if (formData.manufacturingDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) < new Date(formData.manufacturingDate)) {
        errs.expiryDate = 'Expiry date must be on or after manufacturing date';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/stock/in', {
        product: formData.product,
        batchNumber: formData.batchNumber.trim(),
        supplier: formData.supplier,
        location: formData.location,
        quantity: Number(formData.quantity),
        manufacturingDate: formData.manufacturingDate,
        expiryDate: formData.expiryDate,
        reason: formData.reason,
      });

      success(`Successfully received ${formData.quantity} units! Batch quantity updated.`);

      // Reset form
      setFormData({
        product: products[0]?._id || '',
        batchNumber: '',
        supplier: suppliers[0]?._id || '',
        location: locations[0]?._id || '',
        quantity: '',
        manufacturingDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        reason: 'Restocking shipment',
      });
      setFormErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Stock In operation failed';
      setFormErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return <LoadingSpinner text="Preparing Stock In form..." />;
  }

  return (
    <div className="stock-in-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Stock Inflow (Receipt)</h2>
          <p>Record received goods from suppliers into designated warehouse batches</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/inventory')}>
          ← View Inventory
        </Button>
      </div>

      <Card title="Intake Shipment Details">
        {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <Select
              label="Select Product"
              name="product"
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              options={products.map((p) => ({ value: p._id, label: `${p.productName} (${p.SKU})` }))}
              error={formErrors.product}
              required
            />

            <Input
              label="Batch / Lot Number"
              name="batchNumber"
              value={formData.batchNumber}
              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
              placeholder="e.g. BATCH-2026-A1"
              error={formErrors.batchNumber}
              required
            />
          </div>

          <div className="form-row">
            <Select
              label="Supplier Vendor"
              name="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              options={suppliers.map((s) => ({ value: s._id, label: s.companyName || s.name }))}
              error={formErrors.supplier}
              required
            />

            <Select
              label="Receiving Warehouse Location"
              name="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              options={locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))}
              error={formErrors.location}
              required
            />
          </div>

          <div className="form-row">
            <Input
              label="Quantity to Receive"
              name="quantity"
              type="number"
              min="1"
              step="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g. 100"
              error={formErrors.quantity}
              required
            />

            <Input
              label="Manufacturing Date"
              name="manufacturingDate"
              type="date"
              value={formData.manufacturingDate}
              onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
              error={formErrors.manufacturingDate}
              required
            />

            <Input
              label="Expiry Date"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              error={formErrors.expiryDate}
              required
            />
          </div>

          <Input
            label="Intake Notes / Reason"
            name="reason"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g. PO #10842 Supplier Delivery"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setFormData({
                  product: products[0]?._id || '',
                  batchNumber: '',
                  supplier: suppliers[0]?._id || '',
                  location: locations[0]?._id || '',
                  quantity: '',
                  manufacturingDate: new Date().toISOString().split('T')[0],
                  expiryDate: '',
                  reason: 'Initial stock intake',
                });
                setFormErrors({});
              }}
            >
              Reset Form
            </Button>
            <Button type="submit" variant="primary" size="md" loading={submitting}>
              Confirm Stock In
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockIn;
