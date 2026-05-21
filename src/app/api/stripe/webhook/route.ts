import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing signature', { status: 400 });

  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new NextResponse(`Webhook signature failed: ${err}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const startToken = crypto.randomBytes(24).toString('hex');

    const { createAdminClient } = await import('@/lib/supabase/server');
    const admin = await createAdminClient();

    const { error } = await admin.from('pending_subscriber').insert({
      stripe_session_id: session.id,
      stripe_customer_email: session.customer_details?.email || 'unknown',
      start_token: startToken,
      amount_paid_cents: session.amount_total || 0,
    });

    if (error) {
      console.error('Failed to insert pending_subscriber:', error);
      return new NextResponse('Database error', { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
