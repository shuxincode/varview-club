import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { setTelegramWebhook } from '../src/lib/telegram';

async function main() {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!url || !secret) {
    console.error('Missing NEXT_PUBLIC_SITE_URL or TELEGRAM_WEBHOOK_SECRET in environment');
    process.exit(1);
  }

  const result = await setTelegramWebhook(url, secret);
  console.log('Webhook set:', JSON.stringify(result, null, 2));
}

main();
