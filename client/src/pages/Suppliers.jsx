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

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);

      const res = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  }, [page, search, toastError]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setModalMode('edit');
    setSelectedSupplier(sup);
    setFormData({
      name: sup.name,
      companyName: sup.companyName,
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      status: sup.status || 'active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Contact name is required';
    if (!formData.companyName.trim()) errors.companyName = 'Company name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        email: formData.email ? formData.email.trim() : undefined,
        phone: formData.phone ? formData.phone.trim() : undefined,
        address: formData.address ? formData.address.trim() : undefined,
        status: formData.status,
      };

      if (modalMode === 'add') {
        await api.post('/suppliers', payload);
        success('Supplier created successfully');
      } else {
        await api.put(`/suppliers/${selectedSupplier._id}`, payload);
        success('Supplier updated successfully');
      }
      setIsModalOpen(false);
      fetchSuppliers();
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
      await api.delete(`/suppliers/${deleteId}`);
      success('Supplier deleted successfully');
      setDeleteId(null);
      fetchSuppliers();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete supplier');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="suppliers-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Suppliers Directory</h2>
          <p>Manage vendors, manufacturers, and supply chain partners</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon="+" onClick={handleOpenAdd}>
            Add Supplier
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
            placeholder="Search by contact, company name, or email..."
          />
        </div>

        {loading ? (
          <LoadingSpinner text="Loading suppliers..." />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon="🏭"
            title="No suppliers found"
            message="No supplier records match your search criteria."
            action={
              isAdmin && (
                <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                  Add Supplier
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table headers={['Contact Name', 'Company', 'Email', 'Phone', 'Status', 'Actions']}>
              {suppliers.map((sup) => (
                <tr key={sup._id}>
                  <td>
                    <strong>{sup.name}</strong>
                  </td>
                  <td>{sup.companyName}</td>
                  <td>{sup.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{sup.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <Badge status={sup.status}>{sup.status}</Badge>
                  </td>
                  <td>
                    {isAdmin ? (
                      <div className="table-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(sup)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteId(sup._id)}
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

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Create Supplier' : 'Edit Supplier'}
      >
        <form onSubmit={handleSubmit}>
          {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

          <div className="form-row">
            <Input
              label="Contact Person Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
              error={formErrors.name}
              required
            />

            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Global Tech Distributors"
              error={formErrors.companyName}
              required
            />
          </div>

          <div className="form-row">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="orders@globaltech.com"
              error={formErrors.email}
            />

            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <Input
            label="Physical Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Industrial Area, Phase II"
          />

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
              {modalMode === 'add' ? 'Create Supplier' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? Suppliers referenced by inventory batches cannot be deleted."
        loading={isDeleting}
      />
    </div>
  );
};

export default Suppliers;
