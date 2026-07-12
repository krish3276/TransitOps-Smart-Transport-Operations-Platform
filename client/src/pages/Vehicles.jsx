import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import '../styles/vehicles.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const VEHICLE_TYPES = ['All', 'Van', 'Truck', 'Mini', 'Bus', 'Car'];
const STATUSES = ['All', 'Available', 'On Trip', 'In Shop', 'Retired'];

const EMPTY_FORM = {
  registrationNumber: '',
  name: '',
  type: 'Van',
  maxLoadCapacity: '',
  odometer: '',
  acquisitionCost: '',
};

// ── Status badge colours matching mockup ─────────────────────────────────────
function StatusBadge({ status }) {
  const cls = {
    Available: 'badge-available',
    'On Trip': 'badge-on-trip',
    'In Shop': 'badge-in-shop',
    Retired: 'badge-retired',
  }[status] || '';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

// ── Add / Edit Modal ─────────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, onSaved }) {
  const [form, setForm] = useState(
    vehicle
      ? {
          registrationNumber: vehicle.registrationNumber,
          name: vehicle.name,
          type: vehicle.type,
          maxLoadCapacity: vehicle.maxLoadCapacity,
          odometer: vehicle.odometer,
          acquisitionCost: vehicle.acquisitionCost,
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (vehicle) {
        await api.put(`/vehicles/${vehicle._id}`, form);
        toast.success('Vehicle updated');
      } else {
        await api.post('/vehicles', form);
        toast.success('Vehicle added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Registration No. *</label>
              <input
                value={form.registrationNumber}
                onChange={set('registrationNumber')}
                placeholder="e.g. GJ01AB4521"
                required
                disabled={!!vehicle}
              />
            </div>
            <div className="form-group">
              <label>Vehicle Name / Model *</label>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. VAN-05"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type *</label>
              <select value={form.type} onChange={set('type')} required>
                {VEHICLE_TYPES.filter((t) => t !== 'All').map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Max Load Capacity (kg) *</label>
              <input
                type="number"
                value={form.maxLoadCapacity}
                onChange={set('maxLoadCapacity')}
                placeholder="e.g. 500"
                min={1}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Odometer (km)</label>
              <input
                type="number"
                value={form.odometer}
                onChange={set('odometer')}
                placeholder="e.g. 74000"
                min={0}
              />
            </div>
            <div className="form-group">
              <label>Acquisition Cost (₹)</label>
              <input
                type="number"
                value={form.acquisitionCost}
                onChange={set('acquisitionCost')}
                placeholder="e.g. 620000"
                min={0}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : vehicle ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirm({ vehicle, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/vehicles/${vehicle._id}`);
      toast.success('Vehicle deleted');
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Vehicle</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="delete-confirm-msg">
          Are you sure you want to delete <strong>{vehicle.name}</strong> ({vehicle.registrationNumber})?
          This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Vehicles() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [deleteVehicle, setDeleteVehicle] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vehicles', typeFilter, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.set('type', typeFilter);
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/vehicles?${params}`);
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['vehicles'] });

  const vehicles = data?.vehicles || [];

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-topbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="topbar-right">
          <span className="topbar-user">Raven K.</span>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> + Add Vehicle
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>Type: {t}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>Status: {s}</option>
          ))}
        </select>
        <div className="search-wrap reg-search">
          <Search size={13} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search reg. no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>REG. NO. (UNIQUE)</th>
              <th>NAME / MODEL</th>
              <th>TYPE</th>
              <th>CAPACITY</th>
              <th>ODOMETER</th>
              <th>ACQ. COST</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="table-msg">Loading vehicles…</td></tr>
            )}
            {isError && (
              <tr><td colSpan={8} className="table-msg table-error">Failed to load vehicles</td></tr>
            )}
            {!isLoading && !isError && vehicles.length === 0 && (
              <tr><td colSpan={8} className="table-msg">No vehicles found. Add one!</td></tr>
            )}
            {vehicles.map((v) => (
              <tr key={v._id} className="table-row">
                <td className="reg-num">{v.registrationNumber}</td>
                <td>{v.name}</td>
                <td>{v.type}</td>
                <td>{v.maxLoadCapacity.toLocaleString()} kg</td>
                <td>{v.odometer.toLocaleString()}</td>
                <td>₹{v.acquisitionCost.toLocaleString()}</td>
                <td><StatusBadge status={v.status} /></td>
                <td className="row-actions">
                  <button
                    className="icon-btn"
                    title="Edit"
                    onClick={() => setEditVehicle(v)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    title="Delete"
                    onClick={() => setDeleteVehicle(v)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Business Rule Note (matching mockup) ── */}
      <p className="rule-note">
        Rule: Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>

      {/* ── Modals ── */}
      {showAdd && (
        <VehicleModal onClose={() => setShowAdd(false)} onSaved={refresh} />
      )}
      {editVehicle && (
        <VehicleModal
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
          onSaved={refresh}
        />
      )}
      {deleteVehicle && (
        <DeleteConfirm
          vehicle={deleteVehicle}
          onClose={() => setDeleteVehicle(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}
