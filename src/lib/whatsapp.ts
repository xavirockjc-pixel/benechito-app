// Envío de WhatsApp CENTRALIZADO: todo sale desde el número Benechito conectado al
// servidor (Evolution API), NO desde el teléfono del vendedor ni del admin. Así el
// cliente recibe siempre del mismo contacto "Benechito".
//
// Camino principal (directo): EVOLUTION_API_URL + EVOLUTION_API_KEY + EVOLUTION_INSTANCE.
// Respaldo (webhook n8n): WHATSAPP_WEBHOOK_URL (+ opcional WHATSAPP_WEBHOOK_TOKEN).
// Si nada está configurado, no hace nada (fire-and-forget) y nunca rompe la venta.

/** Normaliza un teléfono chileno a formato internacional sin símbolos (569XXXXXXXX). */
export function normalizarTelefono(w?: string | null): string {
  const d = (w || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("56")) return d;
  if (d.length === 9) return "56" + d;      // 9XXXXXXXX
  if (d.length === 8) return "569" + d;     // XXXXXXXX
  return d;
}

export type EnvioWhatsApp = {
  telefono: string;
  nombre?: string;
  mensaje: string;
  /** Adjunto opcional (ej. PDF/imagen de la factura). dataURL o base64 puro. */
  archivoBase64?: string | null;
  archivoNombre?: string | null;
  archivoTipo?: string | null; // ej. application/pdf, image/jpeg
};

const evoCfg = () => ({
  url: (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, ""),
  key: process.env.EVOLUTION_API_KEY || "",
  instancia: process.env.EVOLUTION_INSTANCE || "benechito",
});

/** Envía directo por Evolution API (texto y, si hay, un adjunto). */
async function enviarPorEvolution(e: EnvioWhatsApp, telefono: string): Promise<{ ok: boolean; motivo: string }> {
  const { url, key, instancia } = evoCfg();
  const headers = { "Content-Type": "application/json", apikey: key };
  try {
    // 1) Texto
    const rt = await fetch(`${url}/message/sendText/${instancia}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: telefono, text: e.mensaje }),
      signal: AbortSignal.timeout(15000),
    });
    // 2) Adjunto (PDF/imagen) como documento
    if (e.archivoBase64) {
      const base64 = e.archivoBase64.replace(/^data:[^;]+;base64,/, "");
      const esImg = (e.archivoTipo || "").startsWith("image/");
      await fetch(`${url}/message/sendMedia/${instancia}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: telefono,
          mediatype: esImg ? "image" : "document",
          mimetype: e.archivoTipo || "application/pdf",
          media: base64,
          fileName: e.archivoNombre || (esImg ? "factura.jpg" : "factura.pdf"),
          caption: "",
        }),
        signal: AbortSignal.timeout(20000),
      }).catch(() => {});
    }
    return { ok: rt.ok, motivo: rt.ok ? "ok" : `http_${rt.status}` };
  } catch {
    return { ok: false, motivo: "error_red" };
  }
}

/** Envía por webhook n8n (respaldo). */
async function enviarPorWebhook(e: EnvioWhatsApp, telefono: string, url: string): Promise<{ ok: boolean; motivo: string }> {
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN ?? "";
  const archivo = e.archivoBase64
    ? { base64: e.archivoBase64.replace(/^data:[^;]+;base64,/, ""), nombre: e.archivoNombre ?? "documento.pdf", tipo: e.archivoTipo ?? "application/pdf" }
    : null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-webhook-token": token } : {}) },
      body: JSON.stringify({ telefono, nombre: e.nombre ?? "", mensaje: e.mensaje, archivo }),
      signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, motivo: res.ok ? "ok" : `http_${res.status}` };
  } catch {
    return { ok: false, motivo: "error_red" };
  }
}

/**
 * Envía un WhatsApp al cliente desde el número Benechito. Usa Evolution directo si
 * está configurado; si no, el webhook n8n. Devuelve {ok, motivo}. No lanza.
 */
export async function enviarWhatsApp(e: EnvioWhatsApp): Promise<{ ok: boolean; motivo: string }> {
  const telefono = normalizarTelefono(e.telefono);
  if (!telefono) return { ok: false, motivo: "sin_telefono" };

  const { url: evoUrl, key } = evoCfg();
  if (evoUrl && key) return enviarPorEvolution(e, telefono);

  const webhook = process.env.WHATSAPP_WEBHOOK_URL || process.env.N8N_PREVENTA_WEBHOOK_URL;
  if (webhook) return enviarPorWebhook(e, telefono, webhook);

  return { ok: false, motivo: "sin_configurar" };
}

/** ¿Está configurado el envío centralizado? (para decidir si mostrar botones manuales). */
export function whatsappCentralActivo(): boolean {
  const { url, key } = evoCfg();
  return !!((url && key) || process.env.WHATSAPP_WEBHOOK_URL || process.env.N8N_PREVENTA_WEBHOOK_URL);
}
