import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

function StatusBadge({ status }) {
  const isClosed = status === 'Closed';
  // Mockup shows "In Shop" in orange, "Completed" in green for the table
  const label = isClosed ? 'Completed' : 'In Shop';
  const cls = isClosed ? 'badge-available' : 'badge-in-shop';
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export default function Maintenance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  // Form state
  const [form, setForm] = useState({
    vehicle: '',
    description: '',
    cost: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: async () => {
      const { data } = await api.get('/maintenance');
      return data.logs;
    }
  });
  const logs = logsData || [];

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'maintenance-eligible'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?limit=1000');
      // Can't put On Trip or Retired vehicles into maintenance
      return data.vehicles.filter(v => v.status !== 'On Trip' && v.status !== 'Retired');
    }
  });
  const vehicles = vehiclesData || [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['maintenanceLogs'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicle || !form.description || !form.cost || !form.date) return;

    try {
      await api.post('/maintenance', form);
      toast.success('Maintenance record logged');
      refresh();
      setForm({ vehicle: '', description: '', cost: '', date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create record');
    }
  };

  const handleCloseLog = async (log) => {
    const sure = window.confirm(`Mark maintenance for ${log.vehicle?.name} as Completed?`);
    if (!sure) return;

    try {
      await api.patch(`/maintenance/${log._id}/close`);
      toast.success('Maintenance completed. Vehicle is now Available.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete record');
    }
  };

  return (
    <div className="page trips-layout">
      {/* ── Left Pane (Form) ── */}
      <div className="trips-form-pane">
        <div className="pane-header">
          <h2>LOG SERVICE RECORD</h2>
        </div>
        <div className="pane-body">
          <form className="dispatch-form" onSubmit={handleSave}>
            <div className="form-group">
              <label>VEHICLE</label>
              <select value={form.vehicle} onChange={setF('vehicle')} required>
                <option value="">Select a vehicle...</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.name} ({v.registrationNumber})</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>SERVICE TYPE</label>
              <input value={form.description} onChange={setF('description')} required placeholder="e.g. Oil Change" />
            </div>

            <div className="form-group">
              <label>COST (₹)</label>
              <input type="number" value={form.cost} onChange={setF('cost')} required placeholder="e.g. 2500" />
            </div>

            <div className="form-group">
              <label>DATE</label>
              <input type="date" value={form.date} onChange={setF('date')} required />
            </div>

            <div className="form-group">
              <label>STATUS</label>
              <div className="read-only-field">Active</div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: 12 }}>
              Save
            </button>
          </form>

          {/* Business rule diagram matching mockup */}
          <div className="maintenance-rules-diagram" style={{ marginTop: '24px', fontSize: '13px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
               <span style={{ color: 'var(--green)', minWidth: 60 }}>Available</span>
               <div style={{ flex: 1, borderTop: '1px dashed var(--text-muted)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', padding: '0 8px', fontSize: 11, color: 'var(--text-muted)' }}>creating active record</span>
                  <span style={{ position: 'absolute', right: -4, top: -7, color: 'var(--text-muted)' }}>&gt;</span>
               </div>
               <span style={{ color: 'var(--orange)' }}>In Shop</span>
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <span style={{ color: 'var(--orange)', minWidth: 60 }}>In Shop</span>
               <div style={{ flex: 1, borderTop: '1px dashed var(--text-muted)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', padding: '0 8px', fontSize: 11, color: 'var(--text-muted)' }}>closing record (not retired)</span>
                  <span style={{ position: 'absolute', right: -4, top: -7, color: 'var(--text-muted)' }}>&gt;</span>
               </div>
               <span style={{ color: 'var(--green)' }}>Available</span>
             </div>
             
             <p className="rule-note" style={{ borderTop: 'none', padding: '16px 0 0' }}>
              Note: In Shop vehicles are removed from the dispatch pool.
             </p>
          </div>
        </div>
      </div>

      {/* ── Right Pane (Service Log Table) ── */}
      <div className="trips-board-pane" style={{ width: 'auto', flex: 2, minWidth: 500 }}>
        <div className="board-header">
          <h2>SERVICE LOG</h2>
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input 
              className="search-input" 
              style={{ width: '100%', padding: '4px 8px 4px 28px', fontSize: 12 }} 
              placeholder="Search..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-wrap" style={{ padding: '0 16px', marginTop: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>VEHICLE</th>
                <th>SERVICE</th>
                <th>COST</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading && <tr><td colSpan={4} className="table-msg">Loading logs...</td></tr>}
              {!logsLoading && logs.length === 0 && <tr><td colSpan={4} className="table-msg">No service records found.</td></tr>}
              {logs.filter(l => !search || l.vehicle?.name.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase())).map(log => (
                <tr key={log._id} className="table-row">
                  <td style={{ fontWeight: 600 }}>{log.vehicle?.name || 'Unknown'}</td>
                  <td>{log.description}</td>
                  <td>₹{log.cost.toLocaleString()}</td>
                  <td>
                    {log.status === 'Active' ? (
                      <button 
                        className="btn" 
                        style={{ background: 'var(--orange)', color: '#fff', padding: '4px 12px', fontSize: 11, border: 'none', borderRadius: 4 }}
                        onClick={() => handleCloseLog(log)}
                        title="Click to mark as Completed"
                      >
                        In Shop
                      </button>
                    ) : (
                      <StatusBadge status={log.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
