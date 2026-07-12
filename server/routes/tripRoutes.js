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
  .post(authorize('Fleet Manager', 'Driver'), createTrip);

router.route('/:id')
  .get(getTrip)
  .delete(authorize('Fleet Manager'), deleteTrip); // only managers can delete completely

router.patch('/:id/dispatch', authorize('Fleet Manager', 'Driver'), dispatchTrip);
router.patch('/:id/complete', authorize('Fleet Manager', 'Driver'), completeTrip);
router.patch('/:id/cancel', authorize('Fleet Manager', 'Driver'), cancelTrip);

export default router;
