/**
 * Envía un mensaje a Telegram usando el bot del negocio.
 * Requiere en el entorno: TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
 * TELEGRAM_CHAT_ID admite VARIOS destinos separados por coma (ej: tu id + el del
 * local, o el id de un grupo de Telegram donde estén todos los que preparan).
 * Si no están las variables, no hace nada. "Fire and forget".
 */
export async function notificarTelegram(texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ids = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!token || ids.length === 0) return;
  await Promise.all(
    ids.map((chatId) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "Markdown" }),
      }).catch(() => {}), // un aviso fallido nunca rompe la operación
    ),
  );
}
