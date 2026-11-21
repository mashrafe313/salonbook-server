import { Router } from 'express';

import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller';

import { asyncHandler } from '../utils/asyncHandler';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// Public routes
router.get('/', asyncHandler(getServices));
router.get('/:id', asyncHandler(getServiceById));

// Admin routes — blocked until real authentication is connected
router.post('/', requireAdmin, asyncHandler(createService));
router.patch('/:id', requireAdmin, asyncHandler(updateService));
router.delete('/:id', requireAdmin, asyncHandler(deleteService));

export default router;