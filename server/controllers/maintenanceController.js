import mongoose from 'mongoose';
import MaintenanceLog from '../models/MaintenanceLog.js';
import Vehicle from '../models/Vehicle.js';

// @desc    Get all maintenance logs
// @route   GET /api/maintenance
export const getLogs = async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  // We can't search vehicle reg number directly inside MaintenanceLog unless we aggregate or populate-then-filter.
  // For simplicity, we just filter by status for now.

  const total = await MaintenanceLog.countDocuments(filter);
  const logs = await MaintenanceLog.find(filter)
    .populate('vehicle', 'registrationNumber name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @desc    Create a new Maintenance Log
// @route   POST /api/maintenance
export const createLog = async (req, res) => {
  const { vehicle: vehicleId, description, cost, date } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(vehicleId).session(session);
    if (!vehicle) throw new Error('Vehicle not found');

    if (vehicle.status === 'On Trip') {
      throw new Error('Cannot put a vehicle into maintenance while it is On Trip');
    }

    const log = await MaintenanceLog.create([{
      vehicle: vehicleId,
      description,
      cost,
      date: date || new Date(),
      status: 'Active',
    }], { session });

    // Business Rule: Active maintenance sets vehicle to In Shop immediately
    vehicle.status = 'In Shop';
    await vehicle.save({ session });

    await session.commitTransaction();
    
    // Populate before returning so frontend gets vehicle info immediately
    const populatedLog = await MaintenanceLog.findById(log[0]._id).populate('vehicle', 'registrationNumber name');
    res.status(201).json(populatedLog);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Close a Maintenance Log
// @route   PATCH /api/maintenance/:id/close
export const closeLog = async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });

  if (log.status === 'Closed') {
    return res.status(400).json({ error: 'Maintenance log is already Closed' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(log.vehicle).session(session);

    // Business Rule: Closing maintenance sets vehicle to Available UNLESS it's Retired
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
      await vehicle.save({ session });
    }

    log.status = 'Closed';
    await log.save({ session });

    await session.commitTransaction();

    const populatedLog = await MaintenanceLog.findById(log._id).populate('vehicle', 'registrationNumber name');
    res.json(populatedLog);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
