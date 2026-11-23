
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

import { connectDB } from '../config/db';
import type {
  AppointmentDocument,
  TransactionDocument,
} from '../types/entities';

// POST /api/transactions/demo
// Simulates a payment. No real money or card details are involved.
export async function createDemoPayment(
  req: Request,
  res: Response
) {
  const user = req.authUser;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Only customers can make demo payments',
    });
  }

  const { appointmentId } = req.body as {
    appointmentId?: unknown;
  };

  if (
    typeof appointmentId !== 'string' ||
    !ObjectId.isValid(appointmentId)
  ) {
    return res.status(400).json({
      success: false,
      message: 'A valid appointment ID is required',
    });
  }

  const db = await connectDB();
  const appointments =
    db.collection<AppointmentDocument>('appointments');
  const transactions =
    db.collection<TransactionDocument>('transactions');

  const id = new ObjectId(appointmentId);

  const appointment = await appointments.findOne({
    _id: id,
    customerId: user.id,
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  if (appointment.status !== 'confirmed') {
    return res.status(400).json({
      success: false,
      message: 'Only confirmed appointments can be paid',
    });
  }

  if (appointment.paymentStatus === 'paid') {
    return res.status(409).json({
      success: false,
      message: 'This appointment has already been paid',
    });
  }

  const transactionReference = `DEMO-${randomUUID()}`;

  // Atomic condition prevents two requests from paying
  // the same appointment at the same time.
  const updateResult = await appointments.updateOne(
    {
      _id: id,
      customerId: user.id,
      status: 'confirmed',
      paymentStatus: 'unpaid',
    },
    {
      $set: { paymentStatus: 'paid' },
    }
  );

  if (updateResult.modifiedCount !== 1) {
    return res.status(409).json({
      success: false,
      message: 'Payment could not be completed. Please refresh and try again.',
    });
  }

  const transaction: TransactionDocument = {
    appointmentId: id,
    customerId: user.id,
    amount: appointment.servicePrice,
    currency: 'BDT',
    paymentProvider: 'demo',
    transactionReference,
    status: 'paid',
    createdAt: new Date(),
  };

  try {
    const result = await transactions.insertOne(transaction);

    return res.status(201).json({
      success: true,
      message: 'Demo payment completed successfully. No real money was charged.',
      data: {
        transactionId: result.insertedId,
        transactionReference,
        appointmentId,
        amount: appointment.servicePrice,
        currency: 'BDT',
        paymentProvider: 'demo',
        status: 'paid',
        paymentNotice: 'SIMULATED PAYMENT - NOT A REAL TRANSACTION',
      },
    });
  } catch (error) {
    // Restore unpaid status if transaction recording fails.
    await appointments.updateOne(
      {
        _id: id,
        customerId: user.id,
        paymentStatus: 'paid',
      },
      {
        $set: { paymentStatus: 'unpaid' },
      }
    );

    throw error;
  }
}


// GET /api/transactions (admin only)
export async function getAllTransactions(
  _req: Request,
  res: Response
) {
  const db = await connectDB();

  const transactions = await db
    .collection<TransactionDocument>('transactions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const appointmentIds = transactions.map(
    (transaction) => transaction.appointmentId
  );

  const appointments = await db
    .collection<AppointmentDocument>('appointments')
    .find({
      _id: { $in: appointmentIds },
    })
    .toArray();

  const appointmentMap = new Map(
    appointments.map((appointment) => [
      appointment._id!.toHexString(),
      appointment,
    ])
  );

  const enrichedTransactions = transactions.map(
    (transaction) => {
      const appointment = appointmentMap.get(
        transaction.appointmentId.toHexString()
      );

      return {
        ...transaction,
        serviceName: appointment?.serviceName ?? 'Unknown service',
        appointmentDate: appointment?.appointmentDate ?? null,
        timeSlot: appointment?.timeSlot ?? null,
        customerName: appointment?.customerName ?? 'Unknown customer',
      };
    }
  );

  return res.status(200).json({
    success: true,
    data: enrichedTransactions,
  });
}
