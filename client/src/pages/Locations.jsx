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

const Locations = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    managerName: '',
    contactNumber: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/locations?${params.toString()}`);
      setLocations(res.data?.data || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, toastError]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      managerName: '',
      contactNumber: '',
      status: 'active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setModalMode('edit');
    setSelectedLocation(loc);
    setFormData({
      name: loc.name,
      address: loc.address || '',
      city: loc.city,
      state: loc.state,
      managerName: loc.managerName || '',
      contactNumber: loc.contactNumber || '',
      status: loc.status || 'active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Location name is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        address: formData.address ? formData.address.trim() : undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        managerName: formData.managerName ? formData.managerName.trim() : undefined,
        contactNumber: formData.contactNumber ? formData.contactNumber.trim() : undefined,
        status: formData.status,
      };

      if (modalMode === 'add') {
        await api.post('/locations', payload);
        success('Warehouse location created successfully');
      } else {
        await api.put(`/locations/${selectedLocation._id}`, payload);
        success('Warehouse location updated successfully');
      }
      setIsModalOpen(false);
      fetchLocations();
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
      await api.delete(`/locations/${deleteId}`);
      success('Warehouse location deleted successfully');
      setDeleteId(null);
      fetchLocations();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete location');
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="locations-page">
      <div className="page-header-actions">
        <div className="page-title-block">
          <h2>Warehouse Locations</h2>
          <p>Manage fulfillment centers, storage hubs, and retail outlets</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon="+" onClick={handleOpenAdd}>
            Add Warehouse
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
            placeholder="Search by name, city, or state..."
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
          <LoadingSpinner text="Loading warehouse locations..." />
        ) : locations.length === 0 ? (
          <EmptyState
            icon="📍"
            title="No locations found"
            message="No warehouse locations match your current criteria."
            action={
              isAdmin && (
                <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                  Add Location
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table headers={['Location Name', 'City', 'State', 'Manager', 'Contact', 'Status', 'Actions']}>
              {locations.map((loc) => (
                <tr key={loc._id}>
                  <td>
                    <strong>{loc.name}</strong>
                    {loc.address && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {loc.address}
                      </p>
                    )}
                  </td>
                  <td>{loc.city}</td>
                  <td>{loc.state}</td>
                  <td>{loc.managerName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{loc.contactNumber || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    <Badge status={loc.status}>{loc.status}</Badge>
                  </td>
                  <td>
                    {isAdmin ? (
                      <div className="table-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(loc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteId(loc._id)}
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

      {/* Add / Edit Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Create Warehouse Location' : 'Edit Warehouse Location'}
      >
        <form onSubmit={handleSubmit}>
          {formErrors.api && <div className="login-alert">{formErrors.api}</div>}

          <Input
            label="Location / Facility Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Chennai Central Distribution Center"
            error={formErrors.name}
            required
          />

          <Input
            label="Street Address (Optional)"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g. Plot 42, Anna Nagar Logistics Park"
          />

          <div className="form-row">
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Chennai"
              error={formErrors.city}
              required
            />

            <Input
              label="State / Region"
              name="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="e.g. Tamil Nadu"
              error={formErrors.state}
              required
            />
          </div>

          <div className="form-row">
            <Input
              label="Warehouse Manager Name"
              name="managerName"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              placeholder="e.g. Sarah Connor"
            />

            <Input
              label="Contact Phone Number"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              placeholder="e.g. +91 98765 00000"
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
              {modalMode === 'add' ? 'Create Location' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Location"
        message="Are you sure you want to delete this warehouse location? Locations linked to batches or movement records cannot be deleted."
        loading={isDeleting}
      />
    </div>
  );
};

export default Locations;
