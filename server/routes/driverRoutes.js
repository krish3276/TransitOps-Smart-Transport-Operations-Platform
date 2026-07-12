import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import Driver from '../models/Driver.js';

const router = express.Router();
router.use(protect);

// GET /api/drivers
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const total = await Driver.countDocuments(filter);
  const drivers = await Driver.find(filter)
    .populate('user', 'name email avatar')
    .populate('assignedVehicle', 'registrationNumber type')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ drivers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  const driver = await Driver.findById(req.params.id)
    .populate('user', 'name email avatar')
    .populate('assignedVehicle');
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

// POST /api/drivers
router.post('/', authorize('admin', 'dispatcher'), async (req, res) => {
  const driver = await Driver.create(req.body);
  res.status(201).json(driver);
});

// PUT /api/drivers/:id
router.put('/:id', authorize('admin', 'dispatcher'), async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

// DELETE /api/drivers/:id
router.delete('/:id', authorize('admin'), async (req, res) => {
  const driver = await Driver.findByIdAndDelete(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json({ message: 'Driver removed' });
});

export default router;
