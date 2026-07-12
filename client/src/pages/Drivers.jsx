import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const LICENSE_CATEGORIES = ['LMV', 'HMV', 'HPMV', 'MGV', 'TRANS'];
const STATUSES = ['All', 'Available', 'On Trip', 'Off Duty', 'Suspended'];

const EMPTY_FORM = {
  name: '',
  licenseNumber: '',
  licenseCategory: 'LMV',
  licenseExpiry: '',
  contact: '',
  safetyScore: 100,
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = {
    Available:  'badge-available',
    'On Trip':  'badge-on-trip',
    'Off Duty': 'badge-off-duty',
    Suspended:  'badge-suspended',
  }[status] || '';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

// ── Expiry cell — shows red "EXPIRED" warning when past ───────────────────────
function ExpiryCell({ dateStr }) {
  const date = new Date(dateStr);
  const expired = isPast(date);
  const formatted = format(date, 'MM/yyyy');
  return (
    <span style={{ color: expired ? 'var(--red)' : 'var(--text)', fontWeight: expired ? 600 : 400 }}>
      {formatted}{expired && ' EXPIRED'}
    </span>
  );
}

// ── Status Toggle Buttons (matching mockup bottom strip) ──────────────────────
function StatusToggle({ driver, onToggled }) {
  const [loading, setLoading] = useState(false);

  const toggle = async (newStatus) => {
    if (driver.status === newStatus) return;
    if (driver.status === 'On Trip') {
      toast.error('Cannot change status of a driver who is On Trip');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/drivers/${driver._id}/status`, { status: newStatus });
      toast.success(`Status set to ${newStatus}`);
      onToggled();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Status update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="toggle-strip">
      {['Available', 'Off Duty', 'Suspended'].map((s) => {
        const cls = {
          Available:  'badge-available',
          'Off Duty': 'badge-off-duty',
          Suspended:  'badge-suspended',
        }[s];
        return (
          <button
            key={s}
            disabled={loading || driver.status === 'On Trip'}
            onClick={() => toggle(s)}
            className={`toggle-btn ${cls} ${driver.status === s ? 'toggle-active' : 'toggle-inactive'}`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function DriverModal({ driver, onClose, onSaved }) {
  const [form, setForm] = useState(
    driver
      ? {
          name: driver.name,
          licenseNumber: driver.licenseNumber,
          licenseCategory: driver.licenseCategory,
          licenseExpiry: driver.licenseExpiry?.slice(0, 10) || '',
          contact: driver.contact,
          safetyScore: driver.safetyScore,
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side: warn if expiry is in the past (not blocked, just warned)
    if (form.licenseExpiry && isPast(new Date(form.licenseExpiry))) {
      const confirmed = window.confirm(
        'The license expiry date is in the past — this driver will be flagged as expired and cannot be assigned to trips. Continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      if (driver) {
        await api.put(`/drivers/${driver._id}`, form);
        toast.success('Driver updated');
      } else {
        await api.post('/drivers', form);
        toast.success('Driver added');
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
          <h2>{driver ? 'Edit Driver' : 'Add Driver'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Driver Name *</label>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Alex Kumar"
                required
              />
            </div>
            <div className="form-group">
              <label>License Number *</label>
              <input
                value={form.licenseNumber}
                onChange={set('licenseNumber')}
                placeholder="e.g. DL-88213"
                required
                disabled={!!driver}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>License Category *</label>
              <select value={form.licenseCategory} onChange={set('licenseCategory')} required>
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>License Expiry Date *</label>
              <input
                type="date"
                value={form.licenseExpiry}
                onChange={set('licenseExpiry')}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contact Number *</label>
              <input
                value={form.contact}
                onChange={set('contact')}
                placeholder="e.g. 98765xxxxx"
                required
              />
            </div>
            <div className="form-group">
              <label>Safety Score (0–100)</label>
              <input
                type="number"
                value={form.safetyScore}
                onChange={set('safetyScore')}
                min={0}
                max={100}
                placeholder="e.g. 96"
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : driver ? 'Save Changes' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ driver, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/drivers/${driver._id}`);
      toast.success('Driver deleted');
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
          <h2>Delete Driver</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="delete-confirm-msg">
          Are you sure you want to delete <strong>{driver.name}</strong> ({driver.licenseNumber})?
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

// ── Selected Driver Detail Panel ──────────────────────────────────────────────
function DriverDetailPanel({ driver, onClose, onToggled, onEdit }) {
  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <div className="detail-name">{driver.name}</div>
          <div className="detail-sub">{driver.licenseNumber} · {driver.licenseCategory}</div>
        </div>
        <button className="modal-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="detail-body">
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <StatusBadge status={driver.status} />
        </div>
        <div className="detail-row">
          <span className="detail-label">License Expiry</span>
          <ExpiryCell dateStr={driver.licenseExpiry} />
        </div>
        <div className="detail-row">
          <span className="detail-label">Contact</span>
          <span>{driver.contact}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Safety Score</span>
          <span className="score-val">{driver.safetyScore}%</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Trips Completed</span>
          <span>{driver.tripsCompleted}</span>
        </div>
        {driver.isLicenseExpired && (
          <div className="expired-warning">
            <AlertTriangle size={14} /> License expired — blocked from trip assignment
          </div>
        )}
      </div>
      <div className="detail-section-title">TOGGLE STATUS</div>
      <div style={{ padding: '0 16px 12px' }}>
        <StatusToggle driver={driver} onToggled={onToggled} />
      </div>
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onEdit}>
          <Pencil size={13} /> Edit Profile
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Drivers() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [deleteDriver, setDeleteDriver] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['drivers', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/drivers?${params}`);
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['drivers'] });
    // refresh selected driver if open
    if (selectedDriver) {
      setSelectedDriver((prev) =>
        data?.drivers?.find((d) => d._id === prev._id) || prev
      );
    }
  };

  const drivers = data?.drivers || [];

  return (
    <div className="page drivers-layout">
      {/* ── Left: Table area ── */}
      <div className="drivers-main">
        {/* Top bar */}
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
        </div>

        {/* Filter bar — status only (no type filter for drivers) */}
        <div className="filter-bar">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`filter-pill ${statusFilter === s ? 'filter-pill-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Driver
          </button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>DRIVER</th>
                <th>LICENSE NO.</th>
                <th>CATEGORY</th>
                <th>EXPIRY</th>
                <th>CONTACT</th>
                <th>TRIP COMPL.</th>
                <th>SAFETY</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="table-msg">Loading drivers…</td></tr>
              )}
              {isError && (
                <tr><td colSpan={9} className="table-msg table-error">Failed to load drivers</td></tr>
              )}
              {!isLoading && !isError && drivers.length === 0 && (
                <tr><td colSpan={9} className="table-msg">No drivers found. Add one!</td></tr>
              )}
              {drivers.map((d) => {
                const expired = isPast(new Date(d.licenseExpiry));
                return (
                  <tr
                    key={d._id}
                    className={`table-row ${selectedDriver?._id === d._id ? 'row-selected' : ''}`}
                    onClick={() => setSelectedDriver(d)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td className="reg-num">{d.licenseNumber}</td>
                    <td>{d.licenseCategory}</td>
                    <td><ExpiryCell dateStr={d.licenseExpiry} /></td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.contact}</td>
                    <td>{d.tripsCompleted}</td>
                    <td>
                      <span className={`score-chip ${d.safetyScore >= 90 ? 'score-high' : d.safetyScore >= 70 ? 'score-mid' : 'score-low'}`}>
                        {d.safetyScore}%
                      </span>
                    </td>
                    <td>
                      {expired && d.status !== 'Suspended' ? (
                        <span className="status-badge badge-expired">Expired</span>
                      ) : (
                        <StatusBadge status={d.status} />
                      )}
                    </td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => setEditDriver(d)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Delete"
                        onClick={() => setDeleteDriver(d)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rule note — matching mockup */}
        <p className="rule-note">
          Rule: Expired license or Suspended status → blocked from trip assignment
        </p>
      </div>

      {/* ── Right: Detail panel (slides in when row clicked) ── */}
      {selectedDriver && (
        <DriverDetailPanel
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onToggled={() => {
            qc.invalidateQueries({ queryKey: ['drivers'] });
            // re-fetch updated driver
            api.get(`/drivers/${selectedDriver._id}`).then(({ data }) => setSelectedDriver(data));
          }}
          onEdit={() => {
            setEditDriver(selectedDriver);
            setSelectedDriver(null);
          }}
        />
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <DriverModal onClose={() => setShowAdd(false)} onSaved={refresh} />
      )}
      {editDriver && (
        <DriverModal
          driver={editDriver}
          onClose={() => setEditDriver(null)}
          onSaved={refresh}
        />
      )}
      {deleteDriver && (
        <DeleteConfirm
          driver={deleteDriver}
          onClose={() => setDeleteDriver(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}
