import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import api from '../services/api.js';

export default function Dashboard() {
  const [filters, setFilters] = useState({
    vehicleType: 'All',
    status: 'All',
    region: 'All', // Region is UI only
  });

  const qc = useQueryClient();
  const location = useLocation();

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['dashboardData', filters.vehicleType, filters.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.vehicleType !== 'All') params.set('vehicleType', filters.vehicleType);
      if (filters.status !== 'All') params.set('status', filters.status);
      const res = await api.get(`/dashboard?${params}`);
      return res.data;
    }
  });

  useEffect(() => {
    if (location.pathname === '/') {
      qc.invalidateQueries({ queryKey: ['dashboardData'] });
    }
  }, [location.pathname, qc]);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['dashboardData'] });
  };

  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  if (isLoading) {
    return <div className="page" style={{ padding: 24 }}>Loading dashboard...</div>;
  }

  const { kpis, vehicleStatusBreakdown, recentTrips } = data || {};

  // For the bar chart on the right, we can calculate percentages
  const totalVeh = (vehicleStatusBreakdown?.Available || 0) + 
                   (vehicleStatusBreakdown?.OnTrip || 0) + 
                   (vehicleStatusBreakdown?.InShop || 0) + 
                   (vehicleStatusBreakdown?.Retired || 0);

  const getPercent = (count) => totalVeh === 0 ? 0 : Math.round((count / totalVeh) * 100);

  return (
    <div className="page dashboard-layout" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      
      {/* ── Filters ── */}
      <div className="dashboard-filters" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>FILTERS</div>
          <div style={{ display: 'flex', gap: 16 }}>
          <select className="filter-select" value={filters.vehicleType} onChange={setF('vehicleType')}>
            <option value="All">Vehicle Type: All</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Bus">Bus</option>
            <option value="Motorcycle">Motorcycle</option>
          </select>
          <select className="filter-select" value={filters.status} onChange={setF('status')}>
            <option value="All">Status: All</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
          </select>
          <select className="filter-select" value={filters.region} onChange={setF('region')}>
            <option value="All">Region: All</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
        </div>
        <button className="btn btn-ghost" onClick={handleRefresh} disabled={isLoading || isRefetching}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 16, 
        marginBottom: 40 
      }}>
        {/* Mockup colors: Active(Blue-ish), Available(Green), Maintenance(Orange), Active Trips(Blue), Pending Trips(Grey), Drivers On Duty(Blue), Fleet Utilization(Green) */}
        
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="kpi-label">ACTIVE VEHICLES</div>
          <div className="kpi-value">{kpis?.activeVehicles || 0}</div>
        </div>
        
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="kpi-label">AVAILABLE VEHICLES</div>
          <div className="kpi-value">{kpis?.availableVehicles || 0}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--orange)' }}>
          <div className="kpi-label">VEHICLES IN MAINTENANCE</div>
          <div className="kpi-value">{kpis?.vehiclesInMaintenance || 0}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="kpi-label">ACTIVE TRIPS</div>
          <div className="kpi-value">{kpis?.activeTrips || 0}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="kpi-label">PENDING TRIPS</div>
          <div className="kpi-value">{kpis?.pendingTrips || 0}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="kpi-label">DRIVERS ON DUTY</div>
          <div className="kpi-value">{kpis?.driversOnDuty || 0}</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="kpi-label">FLEET UTILIZATION</div>
          <div className="kpi-value">{kpis?.fleetUtilization || 0}%</div>
        </div>
      </div>

      {/* ── Bottom Section (Recent Trips & Vehicle Status) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 40 }}>
        
        <div className="recent-trips">
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 16 }}>RECENT TRIPS</h2>
          <div className="table-wrap" style={{ margin: 0, padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>TRIP</th>
                  <th>VEHICLE</th>
                  <th>DRIVER</th>
                  <th>STATUS</th>
                  <th>ETA</th>
                </tr>
              </thead>
              <tbody>
                {!recentTrips || recentTrips.length === 0 ? (
                  <tr><td colSpan={5} className="table-msg">No recent trips found.</td></tr>
                ) : (
                  recentTrips.map(trip => (
                    <tr key={trip._id} className="table-row">
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{trip.tripId}</td>
                      <td>{trip.vehicle?.name || '—'}</td>
                      <td>{trip.driver?.name?.split(' ')[0] || '—'}</td>
                      <td>
                        <span className={`status-badge ${
                          trip.status === 'Completed' ? 'badge-available' :
                          trip.status === 'Dispatched' ? 'badge-on-trip' :
                          trip.status === 'Cancelled' ? 'badge-suspended' : 'badge-off-duty'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td>
                        {trip.status === 'Completed' ? '—' : 
                         trip.status === 'Draft' ? 'Awaiting dispatch' :
                         trip.status === 'Cancelled' ? '—' : 'In Transit'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="vehicle-status">
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 24 }}>VEHICLE STATUS</h2>
          <div className="status-bars" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div className="status-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, fontSize: 13, color: 'var(--text)' }}>Available</div>
              <div style={{ flex: 1, height: 12, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${getPercent(vehicleStatusBreakdown?.Available)}%`, height: '100%', background: 'var(--green)' }} />
              </div>
            </div>

            <div className="status-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, fontSize: 13, color: 'var(--text)' }}>On Trip</div>
              <div style={{ flex: 1, height: 12, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${getPercent(vehicleStatusBreakdown?.OnTrip)}%`, height: '100%', background: 'var(--primary)' }} />
              </div>
            </div>

            <div className="status-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, fontSize: 13, color: 'var(--text)' }}>In Shop</div>
              <div style={{ flex: 1, height: 12, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${getPercent(vehicleStatusBreakdown?.InShop)}%`, height: '100%', background: 'var(--orange)' }} />
              </div>
            </div>

            <div className="status-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, fontSize: 13, color: 'var(--text)' }}>Retired</div>
              <div style={{ flex: 1, height: 12, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${getPercent(vehicleStatusBreakdown?.Retired)}%`, height: '100%', background: 'var(--red)' }} />
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
