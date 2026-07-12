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
  .post(authorize('admin', 'fleet_manager', 'dispatcher'), addFuelLog);

router.route('/other')
  .get(getExpenses)
  .post(authorize('admin', 'fleet_manager', 'dispatcher'), addExpense);

router.get('/vehicle-costs', getVehicleCosts);
router.get('/by-trip', getExpensesByTrip);

export default router;
