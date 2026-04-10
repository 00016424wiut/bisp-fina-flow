import { env } from "@bisp-final-flow/env/server";

const TELEGRAM_API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

// Отправить сообщение в Telegram
export async function sendTelegramMessage(
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Уведомить провайдера — сначала Telegram, потом email fallback.
// ВАЖНО: Telegram Bot API принимает только числовой chat_id, а не @username.
// Username сам по себе сообщение не доставит — провайдер должен сначала
// написать боту /start, чтобы мы получили его chatId.
export async function notifyProvider(
  telegramChatId: string | null,
  telegramUsername: string | null,
  message: string
): Promise<void> {
  if (telegramChatId) {
    const sent = await sendTelegramMessage(telegramChatId, message);
    if (sent) return;
    console.warn(`[telegram] sendMessage failed for chatId=${telegramChatId}`);
  } else if (telegramUsername) {
    console.warn(
      `[telegram] provider has username ${telegramUsername} but no chatId — ` +
      `ask them to /start the bot so we can capture their chatId`
    );
  }

  // TODO: email fallback (Неделя 4)
  console.log("Telegram недоступен, нужен email fallback");
}
