
import type { ObjectId } from 'mongodb';

export type ServiceStatus = 'active' | 'inactive';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid';

export type TransactionStatus = 'paid' | 'failed';

export type PaymentProvider = 'demo' | 'stripe';

export interface ServiceDocument {
  _id?: ObjectId;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  image: string;
  status: ServiceStatus;
  createdAt: Date;
}

export interface AppointmentDocument {
  _id?: ObjectId;
  serviceId: ObjectId;
  serviceName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  timeSlot: string;
  message?: string;
  servicePrice: number;
  paymentStatus: PaymentStatus;
  status: AppointmentStatus;
  activeSlotKey?: string;
  createdAt: Date;
}

export interface TransactionDocument {
  _id?: ObjectId;
  appointmentId: ObjectId;
  customerId: string;
  amount: number;
  currency: string;
  paymentProvider: PaymentProvider;
  transactionReference: string;
  stripeSessionId?: string;
  status: TransactionStatus;
  createdAt: Date;
}
