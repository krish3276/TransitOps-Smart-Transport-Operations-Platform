import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import FuelLog from '../models/FuelLog.js';

// Helper to generate next Trip ID (e.g., TR001, TR002)
const generateNextTripId = async () => {
  const lastTrip = await Trip.findOne({}, {}, { sort: { createdAt: -1 } });
  if (!lastTrip || !lastTrip.tripId) return 'TR001';
  
  const lastNum = parseInt(lastTrip.tripId.replace('TR', ''), 10);
  if (isNaN(lastNum)) return 'TR001';
  
  return `TR${String(lastNum + 1).padStart(3, '0')}`;
};

// @desc    Get all trips
// @route   GET /api/trips
export const getTrips = async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (search) {
    filter.tripId = { $regex: search, $options: 'i' };
  }
  
  if (req.user.role === 'Driver') {
    filter.driver = req.user._id;
  }

  const total = await Trip.countDocuments(filter);
  const trips = await Trip.find(filter)
    .populate('vehicle', 'registrationNumber name maxLoadCapacity')
    .populate('driver', 'name licenseNumber contact safetyScore')
    .sort({ createdAt: -1 })
    .skip((page - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ trips, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @desc    Get single trip
// @route   GET /api/trips/:id
export const getTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate('vehicle')
    .populate('driver');
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
};

// @desc    Create a new trip (Draft)
// @route   POST /api/trips
export const createTrip = async (req, res) => {
  const { source, destination, vehicle: vehicleId, driver: driverId, cargoWeight, plannedDistance } = req.body;

  // 1. Fetch vehicle and driver
  const vehicle = await Vehicle.findById(vehicleId);
  const driver = await Driver.findById(driverId);

  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // 2. Exact Rules Validation
  if (vehicle.status !== 'Available') {
    return res.status(400).json({ error: 'Vehicle is not Available' });
  }
  if (driver.status !== 'Available') {
    return res.status(400).json({ error: 'Driver is not Available' });
  }
  if (new Date(driver.licenseExpiry) < new Date()) {
    return res.status(400).json({ error: 'Driver license is expired' });
  }
  if (driver.status === 'Suspended') {
    return res.status(400).json({ error: 'Driver is Suspended' });
  }
  if (Number(cargoWeight) > vehicle.maxLoadCapacity) {
    return res.status(400).json({ error: `Cargo weight exceeds vehicle capacity (${vehicle.maxLoadCapacity} kg)` });
  }

  const tripId = await generateNextTripId();

  const trip = await Trip.create({
    tripId,
    source,
    destination,
    vehicle: vehicleId,
    driver: driverId,
    cargoWeight,
    plannedDistance,
    status: 'Draft',
  });

  res.status(201).json(trip);
};

// @desc    Dispatch a trip (Draft -> Dispatched)
// @route   PATCH /api/trips/:id/dispatch
export const dispatchTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  
  if (trip.status !== 'Draft') {
    return res.status(400).json({ error: `Cannot dispatch trip in ${trip.status} status` });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(trip.vehicle).session(session);
    const driver = await Driver.findById(trip.driver).session(session);

    if (vehicle.status !== 'Available') {
      throw new Error(`Vehicle ${vehicle.name} is no longer Available`);
    }
    if (driver.status !== 'Available') {
      throw new Error(`Driver ${driver.name} is no longer Available`);
    }

    vehicle.status = 'On Trip';
    driver.status = 'On Trip';
    trip.status = 'Dispatched';

    await vehicle.save({ session });
    await driver.save({ session });
    await trip.save({ session });

    await session.commitTransaction();
    res.json(trip);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Complete a trip (Dispatched -> Completed)
// @route   PATCH /api/trips/:id/complete
export const completeTrip = async (req, res) => {
  const { finalOdometer, fuelConsumed, fuelCost, tripRevenue } = req.body;

  if (finalOdometer == null || fuelConsumed == null || fuelCost == null) {
    return res.status(400).json({ error: 'finalOdometer, fuelConsumed, and fuelCost are required' });
  }

  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'Dispatched') {
    return res.status(400).json({ error: `Cannot complete trip in ${trip.status} status` });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(trip.vehicle).session(session);
    const driver = await Driver.findById(trip.driver).session(session);

    // Update vehicle odometer if the new value is higher
    if (Number(finalOdometer) > vehicle.odometer) {
      vehicle.odometer = Number(finalOdometer);
    }

    vehicle.status = 'Available';
    driver.status = 'Available';
    driver.tripsCompleted += 1;

    trip.status = 'Completed';
    trip.finalOdometer = Number(finalOdometer);
    trip.fuelConsumed = Number(fuelConsumed);
    trip.fuelCost = Number(fuelCost);
    if (tripRevenue != null) {
      trip.tripRevenue = Number(tripRevenue);
    }

    // Auto-create FuelLog
    await FuelLog.create([{
      vehicle: vehicle._id,
      trip: trip._id,
      liters: Number(fuelConsumed),
      cost: Number(fuelCost),
      notes: `Auto-generated from Trip ${trip.tripId} completion`,
    }], { session });

    await vehicle.save({ session });
    await driver.save({ session });
    await trip.save({ session });

    await session.commitTransaction();
    res.json(trip);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Cancel a trip
// @route   PATCH /api/trips/:id/cancel
export const cancelTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status === 'Completed' || trip.status === 'Cancelled') {
    return res.status(400).json({ error: `Cannot cancel a trip that is already ${trip.status}` });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vehicle = await Vehicle.findById(trip.vehicle).session(session);
    const driver = await Driver.findById(trip.driver).session(session);

    // If it was dispatched, restore them to Available
    if (trip.status === 'Dispatched') {
      if (vehicle) {
        vehicle.status = 'Available';
        await vehicle.save({ session });
      }
      if (driver) {
        driver.status = 'Available';
        await driver.save({ session });
      }
    }

    trip.status = 'Cancelled';
    await trip.save({ session });

    await session.commitTransaction();
    res.json(trip);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Delete a trip (only Draft or Cancelled)
// @route   DELETE /api/trips/:id
export const deleteTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status === 'Dispatched') {
    return res.status(400).json({ error: 'Cannot delete a Dispatched trip. Cancel it first.' });
  }

  await trip.deleteOne();
  res.json({ message: 'Trip deleted successfully' });
};

// @desc    Get basic stats for dashboard
// @route   GET /api/trips/stats
export const getTripStats = async (_req, res) => {
  const stats = await Trip.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  const result = { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0, total: 0 };
  stats.forEach(({ _id, count }) => {
    if (_id in result) result[_id] = count;
    result.total += count;
  });

  res.json(result);
};
