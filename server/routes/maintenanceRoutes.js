import express from 'express';
import {
  getLogs,
  createLog,
  closeLog,
} from '../controllers/maintenanceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect); // all maintenance routes require auth

router.route('/')
  .get(getLogs)
  .post(authorize('admin', 'fleet_manager'), createLog);

router.patch('/:id/close', authorize('admin', 'fleet_manager'), closeLog);

export default router;
