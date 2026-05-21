import { redirect } from 'next/navigation';

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect('/');

  const { createAdminClient } = await import('@/lib/supabase/server');
  const admin = await createAdminClient();

  let row: { start_token: string } | null = null;
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from('pending_subscriber')
      .select('start_token')
      .eq('stripe_session_id', session_id)
      .maybeSingle();

    if (data) {
      row = data as { start_token: string };
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  if (!row || !botUsername) {
    return (
      <main style={{ maxWidth: 600, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
        <h1>Payment confirmed — preparing your access</h1>
        <p>This is taking longer than usual. Refresh in a moment. If the issue persists, contact support@varviewclub.com.</p>
      </main>
    );
  }

  const telegramUrl = `https://t.me/${botUsername}?start=${row.start_token}`;

  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1>Payment confirmed</h1>
      <p>Opening Telegram to activate your access&hellip;</p>
      <p>
        If nothing happens, <a href={telegramUrl}>tap here</a>.
      </p>
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '${telegramUrl}'; }, 1500);`,
        }}
      />
    </main>
  );
}
