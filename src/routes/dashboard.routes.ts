
import { Router } from 'express';

import {
  getAdminDashboardStats,
  getCustomerDashboardStats,
} from '../controllers/dashboard.controller';

import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All dashboard statistics require authentication.
router.use(authenticate);

// Admin statistics
router.get(
  '/admin',
  requireAdmin,
  asyncHandler(getAdminDashboardStats)
);

// Customer statistics
router.get(
  '/customer',
  asyncHandler(getCustomerDashboardStats)
);

export default router;
