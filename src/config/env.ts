
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),

  CLIENT_URL: z.string().url().default('http://localhost:3000'),

  AUTH_BASE_URL: z.string().url(),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  DB_NAME: z.string().min(1).default('salonbook'),

  IMGBB_API_KEY: z.string().optional(),

  // Stripe credentials are optional during development.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    'Environment validation failed:',
    result.error.flatten().fieldErrors
  );

  throw new Error('Invalid server environment configuration');
}

export const env = result.data;
