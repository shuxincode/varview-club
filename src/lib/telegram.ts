function tgApi() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const res = await fetch(`${tgApi()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return res.json();
}

export async function setTelegramWebhook(url: string, secret: string) {
  const res = await fetch(`${tgApi()}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ['message'],
    }),
  });
  return res.json();
}
