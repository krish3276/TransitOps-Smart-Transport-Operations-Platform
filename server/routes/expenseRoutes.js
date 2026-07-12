import express from 'express';
import {
  getFuelLogs,
  addFuelLog,
  getExpenses,
  addExpense,
  getVehicleCosts,
  getExpensesByTrip,
} from '../controllers/expenseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/fuel')
  .get(authorize('Fleet Manager', 'Financial Analyst'), getFuelLogs)
  .post(authorize('Fleet Manager', 'Financial Analyst'), addFuelLog);

router.route('/other')
  .get(authorize('Fleet Manager', 'Financial Analyst'), getExpenses)
  .post(authorize('Fleet Manager', 'Financial Analyst'), addExpense);

router.get('/vehicle-costs', authorize('Fleet Manager', 'Financial Analyst'), getVehicleCosts);
router.get('/by-trip', authorize('Fleet Manager', 'Financial Analyst'), getExpensesByTrip);

export default router;
