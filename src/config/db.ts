
import { MongoClient, type Db } from 'mongodb';
import { env } from './env';

let client: MongoClient | undefined;
let database: Db | undefined;
let connectionPromise: Promise<Db> | undefined;

async function createIndexes(db: Db) {
  // Services
  await db.collection('services').createIndex({
    status: 1,
    category: 1,
  });

  await db.collection('services').createIndex({
    serviceName: 1,
  });

  // Appointments
  await db.collection('appointments').createIndex({
    customerId: 1,
    createdAt: -1,
  });

  await db.collection('appointments').createIndex({
    status: 1,
    appointmentDate: 1,
    timeSlot: 1,
  });

  await db.collection('appointments').createIndex(
  { activeSlotKey: 1 },
  {
    unique: true,
    sparse: true,
    name: 'unique_active_appointment_slot',
  }
);

  // Transactions
  await db.collection('transactions').createIndex({
    appointmentId: 1,
  });

  await db.collection('transactions').createIndex({
    customerId: 1,
    createdAt: -1,
  });
}

export async function connectDB(): Promise<Db> {
  if (database) {
    return database;
  }

  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      });

      await client.connect();

      const db = client.db(env.DB_NAME);

      await createIndexes(db);

      database = db;

      console.log('MongoDB connected successfully');

      return db;
    })().catch((error) => {
      connectionPromise = undefined;
      client = undefined;
      throw error;
    });
  }

  return connectionPromise;
}
