import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import Trip from '../models/Trip.js';
import { generateTripId } from '../utils/helpers.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { status, vehicle, driver, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (vehicle) filter.vehicle = vehicle;
  if (driver) filter.driver = driver;
  const total = await Trip.countDocuments(filter);
  const trips = await Trip.find(filter)
    .populate('route', 'routeNumber name')
    .populate('vehicle', 'registrationNumber type')
    .populate('driver', 'employeeId user')
    .sort({ scheduledDeparture: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ trips, total, page: Number(page), pages: Math.ceil(total / limit) });
});

router.get('/:id', async (req, res) => {
  const trip = await Trip.findById(req.params.id)
    .populate('route')
    .populate('vehicle')
    .populate('driver');
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

router.post('/', authorize('admin', 'dispatcher'), async (req, res) => {
  const trip = await Trip.create({ ...req.body, tripId: generateTripId() });
  res.status(201).json(trip);
});

router.put('/:id', authorize('admin', 'dispatcher'), async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json({ message: 'Trip removed' });
});

export default router;
