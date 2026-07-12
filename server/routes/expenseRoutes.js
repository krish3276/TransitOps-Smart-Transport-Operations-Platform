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
  .get(getFuelLogs)
  .post(authorize('Fleet Manager', 'Financial Analyst'), addFuelLog);

router.route('/other')
  .get(getExpenses)
  .post(authorize('Fleet Manager', 'Financial Analyst'), addExpense);

router.get('/vehicle-costs', getVehicleCosts);
router.get('/by-trip', getExpensesByTrip);

export default router;
