import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Download, RefreshCw, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api.js';

export default function Analytics() {
  const qc = useQueryClient();
  const location = useLocation();

  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    }
  });

  useEffect(() => {
    if (location.pathname === '/analytics') {
      qc.invalidateQueries({ queryKey: ['analyticsData'] });
    }
  }, [location.pathname, qc]);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['analyticsData'] });
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    let csv = `Metric,Value\n`;
    csv += `Fuel Efficiency,${data.kpis.fuelEfficiency} km/l\n`;
    csv += `Fleet Utilization,${data.kpis.fleetUtilization}%\n`;
    csv += `Operational Cost,${data.kpis.operationalCost}\n`;
    csv += `Vehicle ROI,${data.kpis.vehicleRoi}%\n`;
    csv += `\nTop Costliest Vehicles\n`;
    csv += `Vehicle,Registration,Total Cost\n`;
    
    data.topCostliestVehicles.forEach(v => {
      csv += `${v.vehicle},${v.regNumber},${v.cost}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transitops_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('TransitOps Analytics Report', 14, 20);
    
    // KPI Table
    doc.setFontSize(14);
    doc.text('KPI Summary', 14, 30);
    
    autoTable(doc, {
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Fuel Efficiency', `${data.kpis.fuelEfficiency} km/l`],
        ['Fleet Utilization', `${data.kpis.fleetUtilization}%`],
        ['Operational Cost', `${data.kpis.operationalCost}`],
        ['Vehicle ROI', `${data.kpis.vehicleRoi}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42] }
    });

    // Top Costliest Vehicles Table
    doc.text('Top Costliest Vehicles', 14, doc.lastAutoTable.finalY + 10);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [['Vehicle Name', 'Registration Number', 'Total Cost']],
      body: data.topCostliestVehicles.map(v => [v.vehicle, v.regNumber, v.cost]),
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42] }
    });

    doc.save(`transitops_analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading) {
    return <div className="page" style={{ padding: 24 }}>Loading analytics...</div>;
  }

  const { kpis, topCostliestVehicles, monthlyRevenue } = data || {};

  return (
    <div className="page dashboard-layout" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div className="search-wrap" style={{ visibility: 'hidden' }}>
          <input className="search-input" />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={handleExportPDF}>
            <FileText size={14} /> Export PDF
          </button>
          <button className="btn btn-ghost" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={isLoading || isRefetching}>
            <RefreshCw size={14} className={(isLoading || isRefetching) ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 16, 
        marginBottom: 12 
      }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div className="kpi-label">FUEL EFFICIENCY</div>
          <div className="kpi-value">{kpis?.fuelEfficiency || '0.0'} <span style={{fontSize: 16, fontWeight: 500, color: 'var(--text-muted)'}}>km/l</span></div>
        </div>
        
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="kpi-label">FLEET UTILIZATION</div>
          <div className="kpi-value">{kpis?.fleetUtilization || 0}%</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--orange)' }}>
          <div className="kpi-label">OPERATIONAL COST</div>
          <div className="kpi-value">
            {kpis?.operationalCost ? kpis.operationalCost.toLocaleString() : '0'}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="kpi-label">VEHICLE ROI</div>
          <div className="kpi-value">{kpis?.vehicleRoi || '0.0'}%</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 40, marginLeft: 4 }}>
        ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
      </div>

      {/* ── Bottom Section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        
        {/* Monthly Revenue Chart */}
        <div>
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 24, textTransform: 'uppercase' }}>
            MONTHLY REVENUE
          </h2>
          <div style={{ height: 250, width: '100%', marginLeft: -20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4 }}
                />
                <Bar dataKey="revenue" fill="var(--blue)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Costliest Vehicles */}
        <div>
          <h2 style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 24, textTransform: 'uppercase' }}>
            TOP COSTLIEST VEHICLES
          </h2>
          <div className="status-bars" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!topCostliestVehicles || topCostliestVehicles.length === 0 ? (
              <div className="table-msg" style={{ padding: '20px 0', textAlign: 'left' }}>No cost data available.</div>
            ) : (
              topCostliestVehicles.map((item, i) => {
                const color = i === 0 ? 'var(--red)' : i === 1 ? 'var(--orange)' : 'var(--blue)';
                return (
                  <div key={i} className="status-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 100, fontSize: 13, color: 'var(--text)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                      {item.vehicle}
                    </div>
                    <div style={{ flex: 1, height: 16, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, height: '100%', background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
