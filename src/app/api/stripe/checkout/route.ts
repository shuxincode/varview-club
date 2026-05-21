import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Checkout is no longer available. All features are now unrestricted.' },
    { status: 410 }
  );
}
