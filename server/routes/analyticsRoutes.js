import express from 'express';
import { getAnalyticsData } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize('Fleet Manager', 'Financial Analyst'), getAnalyticsData);

export default router;
