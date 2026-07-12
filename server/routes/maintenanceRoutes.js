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
  .get(authorize('Fleet Manager', 'Financial Analyst'), getLogs)
  .post(authorize('Fleet Manager', 'Financial Analyst'), createLog);

router.patch('/:id/close', authorize('Fleet Manager', 'Financial Analyst'), closeLog);

export default router;
