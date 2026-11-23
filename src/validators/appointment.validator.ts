import { z } from 'zod';

export const appointmentSlots = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;

export const createAppointmentSchema = z.object({
  serviceId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid service ID'),

  appointmentDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Invalid appointment date'
  ),

  timeSlot: z.enum(appointmentSlots),

  message: z.string().trim().max(500).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
});

export type CreateAppointmentInput =
  z.infer<typeof createAppointmentSchema>;