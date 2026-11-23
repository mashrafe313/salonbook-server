
import { Router } from 'express';

import {
  createDemoPayment,
  getAllTransactions,
} from '../controllers/transaction.controller';

import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

// Customer demo payment
router.post('/demo', asyncHandler(createDemoPayment));

// Admin transaction history
router.get(
  '/',
  requireAdmin,
  asyncHandler(getAllTransactions)
);

export default router;
