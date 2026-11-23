import type { Request, Response } from 'express';
import { ObjectId, type Db } from 'mongodb';

import { connectDB } from '../config/db';
import type {
  AppointmentDocument,
  ServiceDocument,
} from '../types/entities';

import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validator';

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

// POST /api/appointments
export async function createAppointment(
  req: Request,
  res: Response
) {
  const parsed = createAppointmentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment information',
      errors: parsed.error.flatten(),
    });
  }

  const { serviceId, appointmentDate, timeSlot, message } =
    parsed.data;

  // Validate that the date is a real calendar date.
  const date = new Date(`${appointmentDate}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== appointmentDate
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please select a valid appointment date',
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (appointmentDate < today) {
    return res.status(400).json({
      success: false,
      message: 'Appointment date cannot be in the past',
    });
  }

  const db = await connectDB();

  const service = await db
    .collection<ServiceDocument>('services')
    .findOne({
      _id: new ObjectId(serviceId),
      status: 'active',
    });

  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service is unavailable',
    });
  }

  const user = req.authUser;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const activeSlotKey = `${appointmentDate}_${timeSlot}`;

  const appointment: AppointmentDocument = {
    serviceId: new ObjectId(serviceId),
    serviceName: service.serviceName,
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    appointmentDate,
    timeSlot,
    message: message || '',
    servicePrice: service.price,
    paymentStatus: 'unpaid',
    status: 'pending',
    activeSlotKey,
    createdAt: new Date(),
  };

  try {
    const result = await db
      .collection<AppointmentDocument>('appointments')
      .insertOne(appointment);

    const created = await db
      .collection<AppointmentDocument>('appointments')
      .findOne({ _id: result.insertedId });

    return res.status(201).json({
      success: true,
      message: 'Appointment request submitted successfully',
      data: created,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: 'This appointment slot is already booked',
      });
    }

    throw error;
  }
}

// GET /api/appointments/my
export async function getMyAppointments(
  req: Request,
  res: Response
) {
  const db = await connectDB();

  const appointments = await db
    .collection<AppointmentDocument>('appointments')
    .find({
      customerId: req.authUser!.id,
    })
    .sort({ createdAt: -1 })
    .toArray();

  return res.status(200).json({
    success: true,
    data: appointments,
  });
}

// PATCH /api/appointments/:id/cancel
export async function cancelMyAppointment(
  req: Request,
  res: Response
) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment ID',
    });
  }

  const db = await connectDB();

  const result = await db
    .collection<AppointmentDocument>('appointments')
    .updateOne(
      {
        _id: new ObjectId(id),
        customerId: req.authUser!.id,
        status: 'pending',
      },
      {
        $set: { status: 'cancelled' },
        $unset: { activeSlotKey: '' },
      }
    );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Pending appointment not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
  });
}

// GET /api/appointments (admin only)
export async function getAllAppointments(
  _req: Request,
  res: Response
) {
  const db = await connectDB();

  const appointments = await db
    .collection<AppointmentDocument>('appointments')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return res.status(200).json({
    success: true,
    data: appointments,
  });
}

// PATCH /api/appointments/:id/status (admin only)
export async function updateAppointmentStatus(
  req: Request,
  res: Response
) {
  const id = req.params.id;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment ID',
    });
  }

  const parsed = updateAppointmentStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment status',
      errors: parsed.error.flatten(),
    });
  }

  const db: Db = await connectDB();
  const { status } = parsed.data;

  const result = await db
    .collection<AppointmentDocument>('appointments')
    .updateOne(
      {
        _id: new ObjectId(id),
        status: 'pending',
      },
      status === 'cancelled'
        ? {
            $set: { status },
            $unset: { activeSlotKey: '' },
          }
        : {
            $set: { status },
          }
    );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: 'Pending appointment not found',
    });
  }

  return res.status(200).json({
    success: true,
    message: `Appointment ${status} successfully`,
  });
}