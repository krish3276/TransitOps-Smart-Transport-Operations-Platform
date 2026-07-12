import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import FuelLog from '../models/FuelLog.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import Expense from '../models/Expense.js';

export const getAnalyticsData = async (req, res) => {
  try {
    // 1. Fuel Efficiency (Average km/L across completed trips)
    const completedTrips = await Trip.find({ status: 'Completed' });
    let totalKm = 0;
    let totalLiters = 0;
    completedTrips.forEach(t => {
      if (t.plannedDistance && t.fuelConsumed) {
        totalKm += t.plannedDistance;
        totalLiters += t.fuelConsumed;
      }
    });
    const fuelEfficiency = totalLiters > 0 ? (totalKm / totalLiters).toFixed(1) : '0.0';

    // 2. Fleet Utilization
    const allVehicles = await Vehicle.find({ status: { $ne: 'Retired' } });
    const onTripVehicles = allVehicles.filter(v => v.status === 'On Trip').length;
    const activeVehicles = allVehicles.length;
    const fleetUtilization = activeVehicles > 0 ? Math.round((onTripVehicles / activeVehicles) * 100) : 0;

    // 3. Operational Cost & Top Costliest Vehicles
    const fuelAgg = await FuelLog.aggregate([{ $group: { _id: '$vehicle', totalCost: { $sum: '$cost' } } }]);
    const maintAgg = await MaintenanceLog.aggregate([{ $group: { _id: '$vehicle', totalCost: { $sum: '$cost' } } }]);
    const otherAgg = await Expense.aggregate([{ $group: { _id: '$vehicle', totalCost: { $sum: '$amount' } } }]);

    let globalFuel = 0;
    let globalMaint = 0;
    let globalOther = 0;
    const vehicleCosts = {};

    const addCost = (aggResult, type) => {
      aggResult.forEach(item => {
        const vId = item._id.toString();
        if (!vehicleCosts[vId]) vehicleCosts[vId] = { fuel: 0, maint: 0, other: 0, total: 0 };
        vehicleCosts[vId][type] += item.totalCost;
        vehicleCosts[vId].total += item.totalCost;
        
        if (type === 'fuel') globalFuel += item.totalCost;
        if (type === 'maint') globalMaint += item.totalCost;
        if (type === 'other') globalOther += item.totalCost;
      });
    };

    addCost(fuelAgg, 'fuel');
    addCost(maintAgg, 'maint');
    addCost(otherAgg, 'other');

    const operationalCost = globalFuel + globalMaint + globalOther;

    // 4. Vehicle ROI
    // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
    let globalRevenue = 0;
    let globalAcq = 0;
    
    // Also build the top costliest list
    const costliestList = [];

    allVehicles.forEach(v => {
      globalRevenue += (v.revenue || 0);
      globalAcq += (v.acquisitionCost || 0);
      
      const vId = v._id.toString();
      const costs = vehicleCosts[vId] || { total: 0 };
      
      costliestList.push({
        vehicle: v.name,
        regNumber: v.registrationNumber,
        cost: costs.total
      });
    });

    costliestList.sort((a, b) => b.cost - a.cost);
    const topCostliestVehicles = costliestList.slice(0, 5);
    const maxCost = topCostliestVehicles.length > 0 ? topCostliestVehicles[0].cost : 1;
    // Calculate percentage for the bars
    topCostliestVehicles.forEach(item => {
      item.percent = Math.round((item.cost / maxCost) * 100);
    });

    // 5. Monthly Revenue (Real data from Completed Trips)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = {};
    let totalTripRevenue = 0;

    completedTrips.forEach(t => {
      const revenue = t.tripRevenue || 0;
      totalTripRevenue += revenue;
      
      const date = new Date(t.updatedAt || t.createdAt);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = {
          name: monthNames[date.getMonth()],
          revenue: 0,
          dateObj: date
        };
      }
      revenueByMonth[monthKey].revenue += revenue;
    });

    // Add aggregated trip revenue to global revenue for ROI calculation
    globalRevenue += totalTripRevenue;

    // Recalculate ROI now that we have globalRevenue completely tallied
    let vehicleRoi = 0;
    if (globalAcq > 0) {
      vehicleRoi = (((globalRevenue - (globalMaint + globalFuel)) / globalAcq) * 100).toFixed(1);
    }

    const monthlyRevenue = Object.values(revenueByMonth)
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(item => ({
        name: item.name,
        revenue: item.revenue
      }));

    res.json({
      kpis: {
        fuelEfficiency,
        fleetUtilization,
        operationalCost,
        vehicleRoi
      },
      topCostliestVehicles,
      monthlyRevenue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
