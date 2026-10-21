import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Products = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    SKU: '',
    description: '',
    category: '',
    unitPrice: '',
    reorderLevel: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // View Details Modal State
  const [viewProduct, setViewProduct] = useState(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?limit=100');
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load categories for dropdown:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 10,
      });
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);

      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, toastError]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      productName: '',
      SKU: '',
      description: '',
      category: categories[0]?._id || '',
      unitPrice: '',
      reorderLevel: '10',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setModalMode('edit');
    setSelectedProduct(prod);
    setFormData({
      productName: prod.productName,
      SKU: prod.SKU,
      description: prod.description || '',
      category: prod.category?._id || prod.category || '',
      unitPrice: prod.unitPrice,
      reorderLevel: prod.reorderLevel,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.productName.trim()) errors.productName = 'Product name is required';
    if (!formData.SKU.trim()) errors.SKU = 'SKU is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.unitPrice === '' || Number(formData.unitPrice) < 0) {
      errors.unitPrice = 'Unit price must be 0 or greater';
    }
    if (formData.reorderLevel === '' || Number(formData.reorderLevel) < 0) {
      errors.reorderLevel = 'Reorder level must be 0 or greater';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setFormSubmitting(true);
      const payload = {
        productName: formData.productName.trim(),
        SKU: formData.SKU.trim(),
        description: formData.description.trim(),
        category: formData.category,
        unitPrice: Number(formData.unitPrice),
        reorderLevel: Number(formData.reorderLevel),
      };

      if (modalMode === 'add') {
        await api.post('/products', payload);
        success('Product created successfully');
      } else {
        await api.put(`/products/${selectedProduct._id}`, payload);
        success('Product updated successfully');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed';
      setFormErrors((prev) => ({ ...prev, api: msg }));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/products/${deleteId}`);
      success('Product deleted successfully');
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete product');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="products-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Product Inventory Catalog</h2>
          <p>Manage product items, SKU identifiers, and reorder levels</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon="+" onClick={handleOpenAdd}>
            Add New Product
          </Button>
        )}
      </div>

      <Card>
        {/* Filters and Search Bar */}
        <div className="filter-row">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by product name or SKU..."
          />
          <div style={{ minWidth: '200px' }}>
            <Select
              placeholder="All Categories"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              options={categories.map((c) => ({ value: c._id, label: c.name }))}
            />
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <LoadingSpinner text="Loading products catalog..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No products found"
            message={
              search || selectedCategory
                ? 'Try adjusting your search criteria or category filter.'
                : 'Get started by creating your first product.'
            }
            action={
              isAdmin && (
                <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                  Add Product
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table headers={['Product Name', 'SKU', 'Category', 'Unit Price', 'Reorder Level', 'Actions']}>
              {products.map((prod) => (
                <tr key={prod._id}>
                  <td>
                    <strong>{prod.productName}</strong>
                    {prod.description && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {prod.description.length > 50 ? `${prod.description.substring(0, 50)}...` : prod.description}
                      </p>
                    )}
                  </td>
                  <td>
                    <code>{prod.SKU}</code>
                  </td>
                  <td>{prod.category?.name || 'Uncategorized'}</td>
                  <td>₹{Number(prod.unitPrice).toLocaleString()}</td>
                  <td>{prod.reorderLevel} units</td>
                  <td>
                    <div className="table-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewProduct(prod)}
                        title="View Details"
                      >
                        👁 View
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(prod)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteId(prod._id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Create New Product' : 'Edit Product'}
      >
        <form onSubmit={handleSubmit}>
          {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

          <Input
            label="Product Name"
            name="productName"
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            placeholder="e.g. ThinkPad T14 Gen 4"
            error={formErrors.productName}
            required
          />

          <Input
            label="SKU (Stock Keeping Unit)"
            name="SKU"
            value={formData.SKU}
            onChange={(e) => setFormData({ ...formData, SKU: e.target.value })}
            placeholder="e.g. TP-T14-001"
            error={formErrors.SKU}
            required
          />

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            error={formErrors.category}
            required
          />

          <div className="form-row">
            <Input
              label="Unit Price (₹)"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              error={formErrors.unitPrice}
              required
            />

            <Input
              label="Reorder Alert Level"
              name="reorderLevel"
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              error={formErrors.reorderLevel}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prod-desc">
              Description (Optional)
            </label>
            <textarea
              id="prod-desc"
              rows="3"
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product specification or details..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formSubmitting}>
              {modalMode === 'add' ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Product Details Modal */}
      <Modal
        isOpen={!!viewProduct}
        onClose={() => setViewProduct(null)}
        title="Product Details"
        size="md"
      >
        {viewProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                Product Name
              </span>
              <h3 style={{ marginTop: '0.2rem' }}>{viewProduct.productName}</h3>
            </div>

            <div className="form-row">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>SKU Code</span>
                <p><code>{viewProduct.SKU}</code></p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Category</span>
                <p>{viewProduct.category?.name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="form-row">
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unit Price</span>
                <p>₹{Number(viewProduct.unitPrice).toLocaleString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Reorder Level</span>
                <p>{viewProduct.reorderLevel} units</p>
              </div>
            </div>

            {viewProduct.description && (
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Description</span>
                <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  {viewProduct.description}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setViewProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? Products with inventory batches or movements cannot be deleted."
        loading={isDeleting}
      />
    </div>
  );
};

export default Products;
