import express from 'express';
import {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  toggleStatus,
  getDriverStats,
  checkExpiringLicensesManually,
} from '../controllers/driverController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect); // all driver routes require auth

// Stats — must be before /:id to avoid "stats" being treated as an id
router.get('/stats', getDriverStats);
router.post('/check-expiring-licenses', authorize('Fleet Manager', 'Safety Officer'), checkExpiringLicensesManually);

router.route('/')
  .get(getDrivers)
  .post(authorize('Fleet Manager', 'Safety Officer'), createDriver);

router.route('/:id')
  .get(getDriver)
  .put(authorize('Fleet Manager', 'Safety Officer'), updateDriver)
  .delete(authorize('Fleet Manager'), deleteDriver);

// Quick status toggle (safety officer can also do this)
router.patch('/:id/status', authorize('Fleet Manager', 'Safety Officer'), toggleStatus);

export default router;
