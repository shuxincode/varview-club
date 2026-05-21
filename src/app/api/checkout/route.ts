import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST() {
  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancel`,
    customer_creation: 'always',
    allow_promotion_codes: false,
  });

  return NextResponse.json({ url: session.url });
}
