import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message || !message.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();

  const { createAdminClient } = await import('@/lib/supabase/server');

  if (text.startsWith('/start ')) {
    const token = text.slice(7).trim();

    const admin = await createAdminClient();
    const { data: pending } = await admin
      .from('pending_subscriber')
      .select('id, consumed_at, stripe_customer_email')
      .eq('start_token', token)
      .maybeSingle();

    if (!pending) {
      await sendTelegramMessage(chatId, 'Invalid or expired token. Visit varviewclub.com to purchase access.');
      return NextResponse.json({ ok: true });
    }

    if (pending.consumed_at) {
      await sendTelegramMessage(chatId, 'This token has already been used. Contact support@varviewclub.com if this is an error.');
      return NextResponse.json({ ok: true });
    }

    const { error: activeErr } = await admin.from('active_subscriber').insert({
      pending_subscriber_id: pending.id,
      telegram_chat_id: chatId,
      telegram_username: message.from?.username || null,
      telegram_first_name: message.from?.first_name || null,
      stripe_customer_email: pending.stripe_customer_email,
    });

    if (activeErr && !activeErr.message?.includes('duplicate')) {
      console.error('Failed to create active_subscriber:', activeErr);
      await sendTelegramMessage(chatId, 'Activation error. Please contact support@varviewclub.com.');
      return NextResponse.json({ ok: true });
    }

    await admin
      .from('pending_subscriber')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', pending.id);

    await sendTelegramMessage(
      chatId,
      `<b>Varview Club</b>\n\nAccess confirmed. The Chairman's picks will arrive here.\n\nKeep notifications enabled. Picks are time-sensitive.`
    );

    return NextResponse.json({ ok: true });
  }

  if (text === '/start') {
    await sendTelegramMessage(chatId, 'Welcome. Access requires payment. Visit varviewclub.com to purchase.');
  } else {
    await sendTelegramMessage(chatId, 'This bot broadcasts the Chairman\'s picks. It does not accept replies. For support: support@varviewclub.com');
  }

  return NextResponse.json({ ok: true });
}
