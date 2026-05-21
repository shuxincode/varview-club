import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '../src/lib/telegram';

async function broadcast(messageText: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: subscribers, error } = await supabaseAdmin
    .from('active_subscriber')
    .select('telegram_chat_id')
    .eq('is_active', true);

  if (error || !subscribers) {
    console.error('Failed to load subscribers:', error);
    return;
  }

  console.log(`Broadcasting to ${subscribers.length} subscribers...`);

  let succeeded = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const result = await sendTelegramMessage(sub.telegram_chat_id, messageText);
      if (result.ok) succeeded++;
      else failed++;
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      failed++;
    }
  }

  await supabaseAdmin.from('broadcast_log').insert({
    message_text: messageText,
    recipients_total: subscribers.length,
    recipients_succeeded: succeeded,
    recipients_failed: failed,
  });

  console.log(`Broadcast complete. Succeeded: ${succeeded}, Failed: ${failed}`);
}

const message = process.argv.slice(2).join(' ');
if (!message) {
  console.error('Usage: npm run broadcast -- "Your message text here"');
  process.exit(1);
}

broadcast(message);
