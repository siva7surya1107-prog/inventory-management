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
import Badge from '../components/Badge';

const Categories = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 10,
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/categories?${params.toString()}`);
      setCategories(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toastError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ name: '', description: '', status: 'active' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setModalMode('edit');
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Category name is required' });
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === 'add') {
        await api.post('/categories', formData);
        success('Category created successfully');
      } else {
        await api.put(`/categories/${selectedCategory._id}`, formData);
        success('Category updated successfully');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormErrors({ api: err.response?.data?.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/categories/${deleteId}`);
      success('Category deleted successfully');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete category');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="categories-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Product Categories</h2>
          <p>Organize products into logical groups and classifications</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon="+" onClick={handleOpenAdd}>
            Add Category
          </Button>
        )}
      </div>

      <Card>
        <div className="filter-row">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by category name..."
          />
          <div style={{ minWidth: '180px' }}>
            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading categories..." />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="No categories found"
            message="No categories match your current search or filter."
            action={
              isAdmin && (
                <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                  Add First Category
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table headers={['Category Name', 'Description', 'Status', 'Actions']}>
              {categories.map((cat) => (
                <tr key={cat._id}>
                  <td>
                    <strong>{cat.name}</strong>
                  </td>
                  <td>{cat.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <Badge status={cat.status}>{cat.status}</Badge>
                  </td>
                  <td>
                    {isAdmin ? (
                      <div className="table-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(cat)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteId(cat._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>View Only</span>
                    )}
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

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Create Category' : 'Edit Category'}
      >
        <form onSubmit={handleSubmit}>
          {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

          <Input
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Computers & Laptops"
            error={formErrors.name}
            required
          />

          <div className="form-group">
            <label className="form-label" htmlFor="cat-desc">
              Description (Optional)
            </label>
            <textarea
              id="cat-desc"
              rows="3"
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter category description..."
            />
          </div>

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {modalMode === 'add' ? 'Create Category' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Categories assigned to active products cannot be deleted."
        loading={isDeleting}
      />
    </div>
  );
};

export default Categories;
