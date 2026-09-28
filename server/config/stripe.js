/**
 * Stripe stub. Returns null until STRIPE_SECRET_KEY is set.
 */
let stripe = null;

const getStripe = () => {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('Stripe not configured (STRIPE_SECRET_KEY missing).');
    return null;
  }
  const Stripe = require('stripe');
  stripe = new Stripe(key);
  return stripe;
};

module.exports = { getStripe };
