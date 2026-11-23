
import Stripe from 'stripe';
import { env } from './env';

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      'Stripe is not configured. Add STRIPE_SECRET_KEY to the server environment.'
    );
  }

  return new Stripe(env.STRIPE_SECRET_KEY);
}
