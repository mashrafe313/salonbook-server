
import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

import { connectDB } from '../config/db';
import { getStripe } from '../config/stripe';
import { env } from '../config/env';

import type {
  AppointmentDocument,
  TransactionDocument,
} from '../types/entities';



export async function createStripeCheckout(
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
      message: 'Only customers can make payments',
    });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      success: false,
      message: 'Stripe is not configured yet.',
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

  const appointment = await db
    .collection<AppointmentDocument>('appointments')
    .findOne({
      _id: new ObjectId(appointmentId),
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

  if (
    !Number.isFinite(appointment.servicePrice) ||
    appointment.servicePrice <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment price',
    });
  }

  const stripe = getStripe();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',

    line_items: [
      {
        price_data: {
          currency: 'bdt',
          product_data: {
            name: appointment.serviceName,
            description: 'SalonBook appointment payment',
          },
          unit_amount: Math.round(
            appointment.servicePrice * 100
          ),
        },
        quantity: 1,
      },
    ],

    client_reference_id: appointmentId,

    metadata: {
      appointmentId,
      customerId: user.id,
    },

    success_url:
      `${env.CLIENT_URL}/dashboard/appointments?payment=success`,

    cancel_url:
      `${env.CLIENT_URL}/dashboard/appointments?payment=cancelled`,
  });

  if (!checkoutSession.url) {
    return res.status(500).json({
      success: false,
      message: 'Unable to create checkout URL',
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Checkout session created',
    data: {
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    },
  });
}



export async function stripeWebhook(
  req: Request,
  res: Response
) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send(
      'Stripe webhook is not configured'
    );
  }

  const signature = req.headers['stripe-signature'];

  if (!signature || Array.isArray(signature)) {
    return res.status(400).send(
      'Missing Stripe signature'
    );
  }

  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return res.status(400).send(
      'Invalid Stripe webhook signature'
    );
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({
      received: true,
    });
  }

  const checkoutSession =
    event.data.object as Stripe.Checkout.Session;

  if (checkoutSession.payment_status !== 'paid') {
    return res.status(200).json({
      received: true,
    });
  }

  const appointmentId =
    checkoutSession.metadata?.appointmentId;

  const customerId =
    checkoutSession.metadata?.customerId;

  if (
    !appointmentId ||
    !customerId ||
    !ObjectId.isValid(appointmentId)
  ) {
    return res.status(400).send(
      'Invalid checkout metadata'
    );
  }

  const db = await connectDB();

  const appointments =
    db.collection<AppointmentDocument>('appointments');

  const transactions =
    db.collection<TransactionDocument>('transactions');

  // Ignore duplicate webhook deliveries.
  const existingTransaction = await transactions.findOne({
    stripeSessionId: checkoutSession.id,
  });

  if (existingTransaction) {
    return res.status(200).json({
      received: true,
    });
  }

  const id = new ObjectId(appointmentId);

  const appointment = await appointments.findOne({
    _id: id,
    customerId,
  });

  if (!appointment || appointment.status !== 'confirmed') {
    return res.status(400).send(
      'Appointment is not eligible for payment'
    );
  }

  // Update the appointment only if it is unpaid.
  if (appointment.paymentStatus !== 'paid') {
    const updateResult = await appointments.updateOne(
      {
        _id: id,
        customerId,
        status: 'confirmed',
        paymentStatus: 'unpaid',
      },
      {
        $set: {
          paymentStatus: 'paid',
        },
      }
    );

    if (updateResult.modifiedCount !== 1) {
      const refreshedAppointment = await appointments.findOne({
        _id: id,
        customerId,
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      if (!refreshedAppointment) {
        return res.status(409).send(
          'Appointment payment update failed'
        );
      }
    }
  }

  try {
    await transactions.insertOne({
      appointmentId: id,
      customerId,
      amount: appointment.servicePrice,
      currency: (
        checkoutSession.currency || 'bdt'
      ).toUpperCase(),
      paymentProvider: 'stripe',
      transactionReference:
        typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : checkoutSession.id,
      stripeSessionId: checkoutSession.id,
      status: 'paid',
      createdAt: new Date(),
    });
  } catch (error) {
    // Ignore duplicate session records.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      return res.status(200).json({
        received: true,
      });
    }

    throw error;
  }

  return res.status(200).json({
    received: true,
  });
}



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

  const updateResult = await appointments.updateOne(
    {
      _id: id,
      customerId: user.id,
      status: 'confirmed',
      paymentStatus: 'unpaid',
    },
    {
      $set: {
        paymentStatus: 'paid',
      },
    }
  );

  if (updateResult.modifiedCount !== 1) {
    return res.status(409).json({
      success: false,
      message:
        'Payment could not be completed. Please refresh and try again.',
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
      message:
        'Demo payment completed successfully. No real money was charged.',
      data: {
        transactionId: result.insertedId,
        transactionReference,
        appointmentId,
        amount: appointment.servicePrice,
        currency: 'BDT',
        paymentProvider: 'demo',
        status: 'paid',
        paymentNotice:
          'SIMULATED PAYMENT - NOT A REAL TRANSACTION',
      },
    });
  } catch (error) {
    await appointments.updateOne(
      {
        _id: id,
        customerId: user.id,
        paymentStatus: 'paid',
      },
      {
        $set: {
          paymentStatus: 'unpaid',
        },
      }
    );

    throw error;
  }
}



export async function getAllTransactions(
  _req: Request,
  res: Response
) {
  const db = await connectDB();

  const transactions = await db
    .collection<TransactionDocument>('transactions')
    .find({})
    .sort({
      createdAt: -1,
    })
    .toArray();

  const appointmentIds = transactions.map(
    (transaction) => transaction.appointmentId
  );

  const appointments = await db
    .collection<AppointmentDocument>('appointments')
    .find({
      _id: {
        $in: appointmentIds,
      },
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
        serviceName:
          appointment?.serviceName ?? 'Unknown service',
        appointmentDate:
          appointment?.appointmentDate ?? null,
        timeSlot:
          appointment?.timeSlot ?? null,
        customerName:
          appointment?.customerName ?? 'Unknown customer',
      };
    }
  );

  return res.status(200).json({
    success: true,
    data: enrichedTransactions,
  });
}
