import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Trip from '../models/Trip.js';

// @desc    Get dashboard KPIs and recent trips
// @route   GET /api/dashboard
export const getDashboardData = async (req, res) => {
  const { vehicleType, status } = req.query; // 'Region' ignored as it's not in schema yet

  // Build vehicle filter
  const vehicleFilter = {};
  if (vehicleType && vehicleType !== 'All') vehicleFilter.type = vehicleType;
  // If status filter is applied, maybe we only filter the total vehicles? 
  // Usually dashboard filters apply to the dataset globally, but let's keep it simple.

  try {
    // 1. Vehicle Stats
    const allVehicles = await Vehicle.find(vehicleFilter);
    const nonRetired = allVehicles.filter(v => v.status !== 'Retired');
    
    // Active Vehicles = Available + On Trip + In Shop (Basically non-retired)
    // Or maybe Active = On Trip? The mockup says "ACTIVE VEHICLES: 53", "AVAILABLE: 42", "IN MAINTENANCE: 5". 
    // If Active = On Trip, then it would be a small number. "Active" usually means "part of the active fleet".
    // I'll define Active Vehicles = Total Non-Retired.
    const activeVehiclesCount = nonRetired.length;
    const availableVehiclesCount = nonRetired.filter(v => v.status === 'Available').length;
    const maintenanceVehiclesCount = nonRetired.filter(v => v.status === 'In Shop').length;
    const onTripVehiclesCount = nonRetired.filter(v => v.status === 'On Trip').length;
    
    // Vehicle Status breakdown for the right-side bars
    const vehicleStatusBreakdown = {
      Available: availableVehiclesCount,
      OnTrip: onTripVehiclesCount,
      InShop: maintenanceVehiclesCount,
      Retired: allVehicles.filter(v => v.status === 'Retired').length
    };

    // Fleet Utilization %
    let fleetUtilization = 0;
    if (activeVehiclesCount > 0) {
      fleetUtilization = Math.round((onTripVehiclesCount / activeVehiclesCount) * 100);
    }

    // 2. Trip Stats
    // Active trips = Dispatched
    const activeTripsCount = await Trip.countDocuments({ status: 'Dispatched' });
    const pendingTripsCount = await Trip.countDocuments({ status: 'Draft' });

    // 3. Driver Stats
    // Drivers On Duty = Drivers with status 'On Trip'
    const driversOnDutyCount = await Driver.countDocuments({ status: 'On Trip' });

    // 4. Recent Trips (latest 5-10)
    const recentTrips = await Trip.find()
      .populate('vehicle', 'name')
      .populate('driver', 'name')
      .sort({ createdAt: -1 })
      .limit(6); // Mockup shows 4-5, we'll send 6

    res.json({
      kpis: {
        activeVehicles: activeVehiclesCount,
        availableVehicles: availableVehiclesCount,
        vehiclesInMaintenance: maintenanceVehiclesCount,
        activeTrips: activeTripsCount,
        pendingTrips: pendingTripsCount,
        driversOnDuty: driversOnDutyCount,
        fleetUtilization,
      },
      vehicleStatusBreakdown,
      recentTrips
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
