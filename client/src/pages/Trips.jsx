import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertCircle, CheckCircle, Navigation, Clock, Truck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

// ── Components ────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cls = {
    Draft: 'badge-off-duty', // grey
    Dispatched: 'badge-on-trip', // blue
    Completed: 'badge-available', // green
    Cancelled: 'badge-suspended', // red
  }[status] || '';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

// ── Trip Dispatcher Page ──────────────────────────────────────────────────────
export default function Trips() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTrip, setSelectedTrip] = useState(null); // null means "Create mode"

  // Form State
  const [form, setForm] = useState({
    source: '',
    destination: '',
    vehicle: '',
    driver: '',
    cargoWeight: '',
    plannedDistance: '',
  });

  // Completion Form State
  const [completeForm, setCompleteForm] = useState({
    finalOdometer: '',
    fuelConsumed: '',
  });

  // Fetch all trips
  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['trips', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const { data } = await api.get(`/trips?${params}`);
      return data.trips;
    },
  });
  const trips = tripsData || [];

  // Fetch vehicles (for dropdown)
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: async () => {
      const { data } = await api.get('/vehicles?status=Available&limit=1000');
      return data.vehicles;
    },
  });
  const availableVehicles = vehiclesData || [];

  // Fetch drivers (for dropdown)
  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'available'],
    queryFn: async () => {
      const { data } = await api.get('/drivers?status=Available&limit=1000');
      // Filter out expired licenses client-side just in case
      return data.drivers.filter(d => new Date(d.licenseExpiry) > new Date());
    },
  });
  const availableDrivers = driversData || [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['trips'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['drivers'] });
  };

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    setForm({
      source: trip.source,
      destination: trip.destination,
      vehicle: trip.vehicle?._id || '',
      driver: trip.driver?._id || '',
      cargoWeight: trip.cargoWeight,
      plannedDistance: trip.plannedDistance,
    });
    setCompleteForm({ finalOdometer: '', fuelConsumed: '' });
  };

  const resetForm = () => {
    setSelectedTrip(null);
    setForm({
      source: '', destination: '', vehicle: '', driver: '', cargoWeight: '', plannedDistance: ''
    });
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Validation
  const selectedVehicleObj = useMemo(() => {
    if (selectedTrip) return selectedTrip.vehicle; // Already populated
    return availableVehicles.find(v => v._id === form.vehicle);
  }, [form.vehicle, availableVehicles, selectedTrip]);

  const weightExceeded = useMemo(() => {
    if (!selectedVehicleObj || !form.cargoWeight) return false;
    return Number(form.cargoWeight) > selectedVehicleObj.maxLoadCapacity;
  }, [selectedVehicleObj, form.cargoWeight]);

  const excessWeight = useMemo(() => {
    if (!weightExceeded) return 0;
    return Number(form.cargoWeight) - selectedVehicleObj.maxLoadCapacity;
  }, [weightExceeded, form.cargoWeight, selectedVehicleObj]);

  const isFormValid = form.source && form.destination && form.vehicle && form.driver && form.cargoWeight && form.plannedDistance && !weightExceeded;

  // Actions
  const handleCreateAndDispatch = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      // 1. Create Draft
      const { data: newTrip } = await api.post('/trips', form);
      // 2. Immediately Dispatch
      await api.patch(`/trips/${newTrip._id}/dispatch`);
      toast.success('Trip created and dispatched successfully');
      refresh();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch trip');
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      await api.post('/trips', form);
      toast.success('Draft trip saved');
      refresh();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save draft');
    }
  };

  const handleDispatchDraft = async () => {
    if (!selectedTrip) return;
    try {
      await api.patch(`/trips/${selectedTrip._id}/dispatch`);
      toast.success('Trip dispatched');
      refresh();
      handleSelectTrip({ ...selectedTrip, status: 'Dispatched' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Dispatch failed');
    }
  };

  const handleComplete = async () => {
    if (!completeForm.finalOdometer || !completeForm.fuelConsumed) {
      toast.error('Odometer and fuel details are required');
      return;
    }
    try {
      await api.patch(`/trips/${selectedTrip._id}/complete`, completeForm);
      toast.success('Trip completed');
      refresh();
      handleSelectTrip({ ...selectedTrip, status: 'Completed', finalOdometer: completeForm.finalOdometer, fuelConsumed: completeForm.fuelConsumed });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Completion failed');
    }
  };

  const handleCancel = async () => {
    if (!selectedTrip) {
      resetForm();
      return;
    }
    const sure = window.confirm('Are you sure you want to cancel this trip?');
    if (!sure) return;
    try {
      if (selectedTrip.status === 'Draft') {
        await api.delete(`/trips/${selectedTrip._id}`);
        toast.success('Draft deleted');
      } else {
        await api.patch(`/trips/${selectedTrip._id}/cancel`);
        toast.success('Trip cancelled');
      }
      refresh();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cancel failed');
    }
  };

  // Helper for stepper
  const currentStep = selectedTrip ? ['Draft', 'Dispatched', 'Completed'].indexOf(selectedTrip.status) : 0;
  const isCancelled = selectedTrip?.status === 'Cancelled';

  return (
    <div className="page trips-layout">
      {/* ── Left Pane (Form / Detail) ── */}
      <div className="trips-form-pane">
        <div className="pane-header">
          <h2>{selectedTrip ? `Trip ${selectedTrip.tripId}` : 'CREATE TRIP'}</h2>
          {selectedTrip && (
            <button className="btn btn-ghost" onClick={resetForm} style={{ padding: '4px 8px' }}>
              <Plus size={14} /> New
            </button>
          )}
        </div>

        <div className="pane-body">
          {/* Stepper */}
          <div className="trip-stepper">
            <div className={`step ${isCancelled ? 'step-cancelled' : currentStep >= 0 ? 'step-active' : ''}`}>Draft</div>
            <div className="step-line" />
            <div className={`step ${isCancelled ? 'step-cancelled' : currentStep >= 1 ? 'step-active' : ''}`}>Dispatched</div>
            <div className="step-line" />
            <div className={`step ${isCancelled ? 'step-cancelled' : currentStep >= 2 ? 'step-active' : ''}`}>
              {isCancelled ? 'Cancelled' : 'Completed'}
            </div>
          </div>

          <form className="dispatch-form" onSubmit={handleCreateAndDispatch}>
            <div className="form-group">
              <label>SOURCE</label>
              <input value={form.source} onChange={setF('source')} disabled={!!selectedTrip} required placeholder="e.g. Gandhinagar Depot" />
            </div>
            <div className="form-group">
              <label>DESTINATION</label>
              <input value={form.destination} onChange={setF('destination')} disabled={!!selectedTrip} required placeholder="e.g. Ahmedabad Hub" />
            </div>
            
            <div className="form-group">
              <label>VEHICLE (AVAILABLE ONLY)</label>
              {selectedTrip ? (
                <div className="read-only-field">{selectedTrip.vehicle?.name || 'Unknown'} - {selectedTrip.vehicle?.maxLoadCapacity} kg</div>
              ) : (
                <select value={form.vehicle} onChange={setF('vehicle')} required>
                  <option value="">Select a vehicle...</option>
                  {availableVehicles.map(v => (
                    <option key={v._id} value={v._id}>{v.name} - {v.maxLoadCapacity} kg capacity</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>DRIVER (AVAILABLE ONLY)</label>
              {selectedTrip ? (
                <div className="read-only-field">{selectedTrip.driver?.name || 'Unknown'}</div>
              ) : (
                <select value={form.driver} onChange={setF('driver')} required>
                  <option value="">Select a driver...</option>
                  {availableDrivers.map(d => (
                    <option key={d._id} value={d._id}>{d.name} (License OK)</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>CARGO WEIGHT (KG)</label>
              <input type="number" value={form.cargoWeight} onChange={setF('cargoWeight')} disabled={!!selectedTrip} required placeholder="e.g. 700" />
            </div>

            <div className="form-group">
              <label>PLANNED DISTANCE (KM)</label>
              <input type="number" value={form.plannedDistance} onChange={setF('plannedDistance')} disabled={!!selectedTrip} required placeholder="e.g. 38" />
            </div>

            {weightExceeded && !selectedTrip && (
              <div className="validation-error">
                <div>Vehicle Capacity: {selectedVehicleObj?.maxLoadCapacity} kg</div>
                <div>Cargo Weight: {form.cargoWeight} kg</div>
                <div className="error-highlight"><AlertCircle size={14} /> Capacity exceeded by {excessWeight} kg — dispatch blocked</div>
              </div>
            )}

            {selectedTrip?.status === 'Dispatched' && (
              <div className="completion-box">
                <h4>Complete Trip</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>FINAL ODOMETER</label>
                    <input type="number" value={completeForm.finalOdometer} onChange={(e) => setCompleteForm(f => ({ ...f, finalOdometer: e.target.value }))} placeholder="e.g. 74500" />
                  </div>
                  <div className="form-group">
                    <label>FUEL CONSUMED (L)</label>
                    <input type="number" value={completeForm.fuelConsumed} onChange={(e) => setCompleteForm(f => ({ ...f, fuelConsumed: e.target.value }))} placeholder="e.g. 45" />
                  </div>
                </div>
              </div>
            )}

            <div className="dispatch-actions">
              {!selectedTrip && (
                <>
                  <button type="submit" className="btn btn-primary" disabled={!isFormValid}>Dispatch</button>
                  <button type="button" className="btn btn-ghost" onClick={handleSaveDraft} disabled={!isFormValid}>Save Draft</button>
                </>
              )}
              {selectedTrip?.status === 'Draft' && (
                <>
                  <button type="button" className="btn btn-primary" onClick={handleDispatchDraft}>Dispatch Now</button>
                  <button type="button" className="btn btn-ghost" onClick={handleCancel}>Delete Draft</button>
                </>
              )}
              {selectedTrip?.status === 'Dispatched' && (
                <>
                  <button type="button" className="btn btn-primary" style={{background: 'var(--green)'}} onClick={handleComplete}>Mark Completed</button>
                  <button type="button" className="btn btn-danger" onClick={handleCancel}>Cancel Trip</button>
                </>
              )}
              {(selectedTrip?.status === 'Completed' || selectedTrip?.status === 'Cancelled') && (
                <button type="button" className="btn btn-ghost" onClick={resetForm} style={{width: '100%', justifyContent: 'center'}}>Close Details</button>
              )}
            </div>
          </form>

          <p className="rule-note" style={{ borderTop: 'none', padding: '16px 0 0' }}>
            On Complete: odometer → fuel log → expenses → Vehicle & Driver Available
          </p>
        </div>
      </div>

      {/* ── Right Pane (Live Board) ── */}
      <div className="trips-board-pane">
        <div className="board-header">
          <h2>LIVE BOARD</h2>
          <div className="search-wrap" style={{width: 200}}>
            <Search size={14} className="search-icon" />
            <input className="search-input" style={{width: '100%', padding: '4px 8px 4px 28px', fontSize: 12}} placeholder="Search TR ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="board-list">
          {tripsLoading && <div className="table-msg">Loading board...</div>}
          {!tripsLoading && trips.length === 0 && <div className="table-msg">No trips found</div>}
          
          {trips.map(trip => (
            <div 
              key={trip._id} 
              className={`trip-card ${selectedTrip?._id === trip._id ? 'trip-card-active' : ''}`}
              onClick={() => handleSelectTrip(trip)}
            >
              <div className="trip-card-top">
                <span className="trip-id">{trip.tripId}</span>
                <span className="trip-entities">
                  {trip.vehicle?.name || 'Unassigned'} / {trip.driver?.name?.split(' ')[0].toUpperCase() || 'UNASSIGNED'}
                </span>
              </div>
              <div className="trip-route">
                {trip.source} <span style={{margin: '0 4px'}}>→</span> {trip.destination}
              </div>
              <div className="trip-card-bottom">
                <StatusPill status={trip.status} />
                <span className="trip-meta">
                  {trip.status === 'Draft' && 'Awaiting dispatch'}
                  {trip.status === 'Dispatched' && 'In transit'}
                  {trip.status === 'Completed' && 'Finished'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
