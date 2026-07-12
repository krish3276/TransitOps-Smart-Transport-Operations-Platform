import mongoose from 'mongoose';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import Vehicle from '../models/Vehicle.js';

// @desc    Get all Fuel Logs
// @route   GET /api/expenses/fuel
export const getFuelLogs = async (req, res) => {
  const logs = await FuelLog.find()
    .populate('vehicle', 'registrationNumber name')
    .populate('trip', 'tripId')
    .sort({ date: -1 })
    .limit(100);
  res.json(logs);
};

// @desc    Add manual Fuel Log
// @route   POST /api/expenses/fuel
export const addFuelLog = async (req, res) => {
  const { vehicle, liters, cost, date, notes } = req.body;
  const log = await FuelLog.create({
    vehicle,
    liters,
    cost,
    date: date || new Date(),
    notes: notes || 'Manual entry',
  });
  const populated = await FuelLog.findById(log._id).populate('vehicle', 'registrationNumber name');
  res.status(201).json(populated);
};

// @desc    Get all other expenses
// @route   GET /api/expenses/other
export const getExpenses = async (req, res) => {
  const expenses = await Expense.find()
    .populate('vehicle', 'registrationNumber name')
    .populate('trip', 'tripId status')
    .sort({ date: -1 })
    .limit(100);
  res.json(expenses);
};

// @desc    Add manual Expense
// @route   POST /api/expenses/other
export const addExpense = async (req, res) => {
  const { vehicle, trip, type, amount, date, notes } = req.body;
  const expense = await Expense.create({
    vehicle,
    trip: trip || undefined,
    type,
    amount,
    date: date || new Date(),
    notes,
  });
  const populated = await Expense.findById(expense._id)
    .populate('vehicle', 'registrationNumber name')
    .populate('trip', 'tripId');
  res.status(201).json(populated);
};

// @desc    Get Total Operational Cost per Vehicle (Fuel + Maintenance)
// @route   GET /api/expenses/vehicle-costs
export const getVehicleCosts = async (req, res) => {
  // Aggregate Fuel Costs
  const fuelAgg = await FuelLog.aggregate([
    { $group: { _id: '$vehicle', totalFuelCost: { $sum: '$cost' } } }
  ]);
  
  // Aggregate Maintenance Costs (from MaintenanceLog)
  const maintAgg = await MaintenanceLog.aggregate([
    { $group: { _id: '$vehicle', totalMaintCost: { $sum: '$cost' } } }
  ]);

  // Aggregate Other Expenses (Toll/Other)
  const otherAgg = await Expense.aggregate([
    { $group: { _id: '$vehicle', totalOtherCost: { $sum: '$amount' } } }
  ]);

  // Merge them by vehicle
  const costsMap = {};
  
  const ensureVehicle = (id) => {
    if (!costsMap[id]) costsMap[id] = { fuel: 0, maintenance: 0, other: 0, total: 0 };
  };

  fuelAgg.forEach(f => {
    ensureVehicle(f._id);
    costsMap[f._id].fuel += f.totalFuelCost;
    costsMap[f._id].total += f.totalFuelCost;
  });

  maintAgg.forEach(m => {
    ensureVehicle(m._id);
    costsMap[m._id].maintenance += m.totalMaintCost;
    costsMap[m._id].total += m.totalMaintCost;
  });

  otherAgg.forEach(o => {
    ensureVehicle(o._id);
    costsMap[o._id].other += o.totalOtherCost;
    costsMap[o._id].total += o.totalOtherCost;
  });

  // Populate vehicle details
  const vehicleIds = Object.keys(costsMap);
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }, 'name registrationNumber');

  const result = vehicles.map(v => ({
    vehicle: v,
    costs: costsMap[v._id.toString()]
  }));

  // Sort by total cost descending
  result.sort((a, b) => b.costs.total - a.costs.total);

  res.json(result);
};

// @desc    Get Expenses Grouped by Trip (for the mockup's bottom table)
// @route   GET /api/expenses/by-trip
export const getExpensesByTrip = async (req, res) => {
  const expenses = await Expense.find({ trip: { $exists: true } })
    .populate('trip', 'tripId status')
    .populate('vehicle', 'name');

  // We need to group them by Trip
  const tripMap = {};
  expenses.forEach(exp => {
    const tripId = exp.trip?._id.toString();
    if (!tripId) return;

    if (!tripMap[tripId]) {
      tripMap[tripId] = {
        tripObj: exp.trip,
        vehicle: exp.vehicle,
        toll: 0,
        maintenance: 0, // In case they manually added maintenance via Expense
        other: 0,
        total: 0
      };
    }
    
    if (exp.type === 'Toll') tripMap[tripId].toll += exp.amount;
    else if (exp.type === 'Maintenance') tripMap[tripId].maintenance += exp.amount;
    else tripMap[tripId].other += exp.amount;
    
    tripMap[tripId].total += exp.amount;
  });

  res.json(Object.values(tripMap));
};
