import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

// ── Modals ────────────────────────────────────────────────────────────────────
function LogFuelModal({ vehicles, onClose, onSaved }) {
  const [form, setForm] = useState({ vehicle: '', liters: '', cost: '', date: new Date().toISOString().slice(0,10) });
  const [loading, setLoading] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/expenses/fuel', form);
      toast.success('Fuel logged successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log fuel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Fuel</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-group">
            <label>VEHICLE *</label>
            <select value={form.vehicle} onChange={setF('vehicle')} required>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>LITERS *</label>
            <input type="number" value={form.liters} onChange={setF('liters')} required />
          </div>
          <div className="form-group">
            <label>TOTAL COST (₹) *</label>
            <input type="number" value={form.cost} onChange={setF('cost')} required />
          </div>
          <div className="form-group">
            <label>DATE *</label>
            <input type="date" value={form.date} onChange={setF('date')} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddExpenseModal({ vehicles, trips, onClose, onSaved }) {
  const [form, setForm] = useState({ vehicle: '', trip: '', type: 'Toll', amount: '', date: new Date().toISOString().slice(0,10) });
  const [loading, setLoading] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/expenses/other', form);
      toast.success('Expense added successfully');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Expense</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="modal-form">
          <div className="form-group">
            <label>VEHICLE *</label>
            <select value={form.vehicle} onChange={setF('vehicle')} required>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>TRIP (OPTIONAL)</label>
            <select value={form.trip} onChange={setF('trip')}>
              <option value="">None</option>
              {trips.filter(t => t.vehicle?._id === form.vehicle).map(t => <option key={t._id} value={t._id}>{t.tripId} ({t.status})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>TYPE *</label>
            <select value={form.type} onChange={setF('type')} required>
              <option value="Toll">Toll</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>AMOUNT (₹) *</label>
            <input type="number" value={form.amount} onChange={setF('amount')} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Fuel() {
  const qc = useQueryClient();
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const { data: fuelLogs = [], isLoading: fuelLoading } = useQuery({
    queryKey: ['fuelLogs'],
    queryFn: async () => {
      const { data } = await api.get('/expenses/fuel');
      return data;
    }
  });

  const { data: expensesByTrip = [], isLoading: expLoading } = useQuery({
    queryKey: ['expensesByTrip'],
    queryFn: async () => {
      const { data } = await api.get('/expenses/by-trip');
      return data;
    }
  });

  const { data: vehicleCosts = [], isLoading: costsLoading } = useQuery({
    queryKey: ['vehicleCosts'],
    queryFn: async () => {
      const { data } = await api.get('/expenses/vehicle-costs');
      return data;
    }
  });

  // For modals
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'all'],
    queryFn: async () => (await api.get('/vehicles?limit=1000')).data.vehicles
  });
  const { data: trips = [] } = useQuery({
    queryKey: ['trips', 'all'],
    queryFn: async () => (await api.get('/trips?limit=1000')).data.trips
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fuelLogs'] });
    qc.invalidateQueries({ queryKey: ['expensesByTrip'] });
    qc.invalidateQueries({ queryKey: ['vehicleCosts'] });
  };

  const totalGlobalOperationalCost = useMemo(() => {
    return vehicleCosts.reduce((acc, curr) => acc + (curr.costs.fuel + curr.costs.maintenance), 0);
  }, [vehicleCosts]);

  return (
    <div className="page" style={{ padding: '0 24px', overflowY: 'auto' }}>
      
      {/* ── Top Area (FUEL LOGS) ── */}
      <div style={{ marginTop: 24, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>FUEL LOGS</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setShowFuelModal(true)}>+ Log Fuel</button>
            <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>+ Add Expense</button>
          </div>
        </div>

        <div className="table-wrap" style={{ margin: 0, padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>VEHICLE</th>
                <th>DATE</th>
                <th>LITERS</th>
                <th>FUEL COST</th>
              </tr>
            </thead>
            <tbody>
              {fuelLoading && <tr><td colSpan={4} className="table-msg">Loading fuel logs...</td></tr>}
              {!fuelLoading && fuelLogs.length === 0 && <tr><td colSpan={4} className="table-msg">No fuel logs found.</td></tr>}
              {fuelLogs.map(log => (
                <tr key={log._id} className="table-row">
                  <td style={{ fontWeight: 600 }}>{log.vehicle?.name || 'Unknown'}</td>
                  <td>{format(new Date(log.date), 'dd MMM yyyy')}</td>
                  <td>{log.liters} L</td>
                  <td>{log.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Middle Area (OTHER EXPENSES) ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 16 }}>OTHER EXPENSES (TOLL / MISC)</h2>
        <div className="table-wrap" style={{ margin: 0, padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>TRIP</th>
                <th>VEHICLE</th>
                <th>TOLL</th>
                <th>OTHER</th>
                <th>MAINT. (LINKED)</th>
                <th>TOTAL</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {expLoading && <tr><td colSpan={7} className="table-msg">Loading expenses...</td></tr>}
              {!expLoading && expensesByTrip.length === 0 && <tr><td colSpan={7} className="table-msg">No expenses linked to trips found.</td></tr>}
              {expensesByTrip.map(exp => (
                <tr key={exp.tripObj?._id} className="table-row">
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{exp.tripObj?.tripId}</td>
                  <td>{exp.vehicle?.name || 'Unknown'}</td>
                  <td>{exp.toll.toLocaleString()}</td>
                  <td>{exp.other.toLocaleString()}</td>
                  <td>{exp.maintenance.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{exp.total.toLocaleString()}</td>
                  <td>
                    {exp.tripObj?.status === 'Completed' ? (
                      <span className="status-badge badge-available">Completed</span>
                    ) : (
                      <span className="status-badge badge-on-trip">{exp.tripObj?.status || 'Unknown'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Area (VEHICLE OPERATIONAL COSTS) ── */}
      <div style={{ marginBottom: 40, borderTop: '2px solid var(--text)', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>TOTAL OPERATIONAL COST (AUTO) = FUEL + MAINT</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>₹{totalGlobalOperationalCost.toLocaleString()}</span>
        </div>
        
        {/* Detail breakdown per vehicle as requested */}
        <h2 style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12, marginTop: 24 }}>OPERATIONAL COST PER VEHICLE (BREAKDOWN)</h2>
        <div className="table-wrap" style={{ margin: 0, padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>VEHICLE</th>
                <th>REG. NO.</th>
                <th>FUEL COST</th>
                <th>MAINTENANCE COST</th>
                <th>TOTAL OPE. COST</th>
              </tr>
            </thead>
            <tbody>
              {costsLoading && <tr><td colSpan={5} className="table-msg">Loading costs...</td></tr>}
              {!costsLoading && vehicleCosts.length === 0 && <tr><td colSpan={5} className="table-msg">No cost data available.</td></tr>}
              {vehicleCosts.map(vc => (
                <tr key={vc.vehicle?._id} className="table-row">
                  <td style={{ fontWeight: 600 }}>{vc.vehicle?.name}</td>
                  <td className="reg-num">{vc.vehicle?.registrationNumber}</td>
                  <td>{vc.costs.fuel.toLocaleString()}</td>
                  <td>{vc.costs.maintenance.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{(vc.costs.fuel + vc.costs.maintenance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showFuelModal && <LogFuelModal vehicles={vehicles} onClose={() => setShowFuelModal(false)} onSaved={refresh} />}
      {showExpenseModal && <AddExpenseModal vehicles={vehicles} trips={trips} onClose={() => setShowExpenseModal(false)} onSaved={refresh} />}
    </div>
  );
}
