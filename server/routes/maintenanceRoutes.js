import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import Maintenance from '../models/Maintenance.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { status, priority, vehicle, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (vehicle) filter.vehicle = vehicle;
  const total = await Maintenance.countDocuments(filter);
  const records = await Maintenance.find(filter)
    .populate('vehicle', 'registrationNumber type make model')
    .populate('reportedBy', 'name role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
});

router.get('/:id', async (req, res) => {
  const record = await Maintenance.findById(req.params.id)
    .populate('vehicle')
    .populate('reportedBy', 'name');
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

router.post('/', async (req, res) => {
  const record = await Maintenance.create({ ...req.body, reportedBy: req.user._id });
  res.status(201).json(record);
});

router.put('/:id', authorize('admin', 'dispatcher'), async (req, res) => {
  const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const record = await Maintenance.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json({ message: 'Record removed' });
});

export default router;
