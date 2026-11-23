
import { Router } from 'express';

import {
  createDemoPayment,
  createStripeCheckout,
  getAllTransactions,
} from '../controllers/transaction.controller';

import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

// Customer payment routes
router.post('/demo', asyncHandler(createDemoPayment));
router.post('/checkout', asyncHandler(createStripeCheckout));

// Admin transaction history
router.get(
  '/',
  requireAdmin,
  asyncHandler(getAllTransactions)
);

export default router;
