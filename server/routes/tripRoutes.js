import express from 'express';
import {
  getTrips,
  getTrip,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  deleteTrip,
  getTripStats,
} from '../controllers/tripController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect); // all trip routes require auth

router.get('/stats', getTripStats);

router.route('/')
  .get(getTrips)
  .post(authorize('admin', 'dispatcher', 'fleet_manager'), createTrip);

router.route('/:id')
  .get(getTrip)
  .delete(authorize('admin', 'dispatcher'), deleteTrip);

router.patch('/:id/dispatch', authorize('admin', 'dispatcher'), dispatchTrip);
router.patch('/:id/complete', authorize('admin', 'dispatcher'), completeTrip);
router.patch('/:id/cancel', authorize('admin', 'dispatcher'), cancelTrip);

export default router;
