// Envío de WhatsApp CENTRALIZADO: todo sale desde el número Benechito conectado al
// servidor (webhook n8n → Evolution API), NO desde el teléfono del vendedor ni del
// admin. Así el cliente recibe siempre del mismo contacto "Benechito".
//
// Requiere en el entorno: WHATSAPP_WEBHOOK_URL (y opcional WHATSAPP_WEBHOOK_TOKEN).
// Si no está configurado, no hace nada (fire-and-forget) y nunca rompe la venta.

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

/**
 * Envía un WhatsApp al cliente desde el número Benechito (vía webhook n8n→Evolution).
 * Devuelve {ok, motivo}. No lanza: si falla, solo informa.
 */
export async function enviarWhatsApp(e: EnvioWhatsApp): Promise<{ ok: boolean; motivo: string }> {
  const url = process.env.WHATSAPP_WEBHOOK_URL || process.env.N8N_PREVENTA_WEBHOOK_URL;
  if (!url) return { ok: false, motivo: "sin_webhook" };
  const telefono = normalizarTelefono(e.telefono);
  if (!telefono) return { ok: false, motivo: "sin_telefono" };
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN ?? "";

  const archivo = e.archivoBase64
    ? {
        base64: e.archivoBase64.replace(/^data:[^;]+;base64,/, ""),
        nombre: e.archivoNombre ?? "documento.pdf",
        tipo: e.archivoTipo ?? "application/pdf",
      }
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

/** ¿Está configurado el envío centralizado? (para decidir si mostrar botones manuales). */
export function whatsappCentralActivo(): boolean {
  return !!(process.env.WHATSAPP_WEBHOOK_URL || process.env.N8N_PREVENTA_WEBHOOK_URL);
}
