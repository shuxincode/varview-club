import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhooks are no longer processed. All features are now unrestricted.' },
    { status: 410 }
  );
}
