/**
 * Envía un mensaje a Telegram usando el bot del negocio.
 * Requiere en el entorno: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
 * Si no están, no hace nada (no rompe el flujo). "Fire and forget".
 */
export async function notificarTelegram(texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
    });
  } catch {
    // Silencioso: un aviso fallido nunca debe romper la operación.
  }
}
