
import { Router } from 'express';

import {
  getUsers,
  blockUser,
  unblockUser,
} from '../controllers/user.controller';

import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// All user-management routes require an authenticated admin.
router.use(authenticate, requireAdmin);

router.get('/', asyncHandler(getUsers));

router.patch('/:id/block', asyncHandler(blockUser));

router.patch('/:id/unblock', asyncHandler(unblockUser));

export default router;
