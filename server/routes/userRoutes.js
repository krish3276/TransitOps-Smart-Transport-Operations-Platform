import express from 'express';
import { getUsers, updateUserRole } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Fleet Manager'));

router.get('/', getUsers);
router.patch('/:id/role', updateUserRole);

export default router;
