import express from 'express';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleStats,
} from '../controllers/vehicleController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // all vehicle routes require auth

router.get('/stats', getVehicleStats);
router.route('/')
  .get(getVehicles)
  .post(authorize('Fleet Manager', 'Safety Officer'), createVehicle);

router.route('/:id')
  .get(getVehicle)
  .put(authorize('Fleet Manager', 'Safety Officer'), updateVehicle)
  .delete(authorize('Fleet Manager'), deleteVehicle);

export default router;
