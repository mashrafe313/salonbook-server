import { Router } from 'express';

import {
  createAppointment,
  getMyAppointments,
  cancelMyAppointment,
  getAllAppointments,
  updateAppointmentStatus,
} from '../controllers/appointment.controller';

import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// All appointment routes require authentication.
router.use(authenticate);

// Customer routes
router.post('/', asyncHandler(createAppointment));
router.get('/my', asyncHandler(getMyAppointments));

router.patch(
  '/:id/cancel',
  asyncHandler(cancelMyAppointment)
);

// Admin routes
router.get(
  '/',
  requireAdmin,
  asyncHandler(getAllAppointments)
);

router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler(updateAppointmentStatus)
);

export default router;