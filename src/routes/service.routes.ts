
import { Router } from 'express';

import {
  getServices,
  getServiceById,
  getAdminServices,
  createService,
  updateService,
  deleteService,
} from '../controllers/service.controller';

import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// Admin-only: all services, including inactive services.
// Keep this route before /:id.
router.get(
  '/admin',
  authenticate,
  requireAdmin,
  asyncHandler(getAdminServices)
);

// Public routes
router.get('/', asyncHandler(getServices));
router.get('/:id', asyncHandler(getServiceById));

// Admin-only routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(createService)
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(updateService)
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(deleteService)
);

export default router;
