import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import Route from '../models/Route.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const routes = await Route.find(filter).sort({ routeNumber: 1 });
  res.json(routes);
});

router.get('/:id', async (req, res) => {
  const route = await Route.findById(req.params.id).populate('createdBy', 'name');
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});

router.post('/', authorize('admin', 'dispatcher'), async (req, res) => {
  const route = await Route.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(route);
});

router.put('/:id', authorize('admin', 'dispatcher'), async (req, res) => {
  const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const route = await Route.findByIdAndDelete(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json({ message: 'Route removed' });
});

export default router;
