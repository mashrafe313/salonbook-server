
import type { Request, Response } from 'express';
import { connectDB } from '../config/db';
import type {
  AppointmentDocument,
  ServiceDocument,
  TransactionDocument,
} from '../types/entities';

export async function getAdminDashboardStats(
  _req: Request,
  res: Response
) {
  const db = await connectDB();

  const [
    totalCustomers,
    activeServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    cancelledAppointments,
    successfulPayments,
  ] = await Promise.all([
    db.collection('users').countDocuments({ role: 'customer' }),

    db.collection<ServiceDocument>('services').countDocuments({
      status: 'active',
    }),

    db.collection<AppointmentDocument>('appointments').countDocuments({}),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      status: 'pending',
    }),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      status: 'confirmed',
    }),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      status: 'cancelled',
    }),

    db.collection<TransactionDocument>('transactions').countDocuments({
      status: 'paid',
    }),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Admin dashboard statistics retrieved successfully',
    data: {
      totalCustomers,
      activeServices,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      cancelledAppointments,
      successfulPayments,
    },
  });
}

export async function getCustomerDashboardStats(
  req: Request,
  res: Response
) {
  const user = req.authUser;

  if (!user || user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Only customers can access these statistics',
    });
  }

  const db = await connectDB();

  const customerFilter = {
    customerId: user.id,
  };

  const [
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    cancelledAppointments,
  ] = await Promise.all([
    db.collection<AppointmentDocument>('appointments').countDocuments(
      customerFilter
    ),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      ...customerFilter,
      status: 'pending',
    }),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      ...customerFilter,
      status: 'confirmed',
    }),

    db.collection<AppointmentDocument>('appointments').countDocuments({
      ...customerFilter,
      status: 'cancelled',
    }),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Customer dashboard statistics retrieved successfully',
    data: {
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      cancelledAppointments,
    },
  });
}
