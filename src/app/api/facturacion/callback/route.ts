import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/facturacion/callback
 * Lo llama tu n8n DESPUÉS de emitir en el SII para escribir el resultado en el
 * DocumentoVenta: folio, PDF/XML y estado. Mantiene sincronizado el campo legacy
 * Venta.facturada/folioFactura para que el módulo 07 (recordatorio) siga andando.
 *
 * Seguridad: header  x-webhook-token: <SII_WEBHOOK_TOKEN>  (o Authorization: Bearer)
 *
 * Cuerpo (JSON):
 *   documentoId  id del DocumentoVenta            (obligatorio)
 *   estado       emitido | enviado | pagado | rechazado   (por defecto emitido)
 *   folio        folio entregado por el SII
 *   urlPdf       link al PDF/XML
 *   canalEnvio   email | whatsapp   (opcional, si ya se envió)
 */

const ESTADOS = ["pendiente", "emitido", "enviado", "pagado", "rechazado"];

export async function POST(req: Request) {
  try {
    const token = process.env.SII_WEBHOOK_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Callback sin configurar (falta SII_WEBHOOK_TOKEN)" }, { status: 503 });
    }
    const auth = req.headers.get("authorization") ?? "";
    const enviado = req.headers.get("x-webhook-token") ?? auth.replace(/^Bearer\s+/i, "");
    if (enviado !== token) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const documentoId = String(body.documentoId ?? "").trim();
    if (!documentoId) {
      return NextResponse.json({ ok: false, error: "Falta documentoId" }, { status: 400 });
    }

    const estadoRaw = String(body.estado ?? "emitido").toLowerCase();
    const estado = ESTADOS.includes(estadoRaw) ? estadoRaw : "emitido";
    const folio = body.folio != null ? String(body.folio).trim() : null;
    const urlPdf = body.urlPdf != null ? String(body.urlPdf).trim() : null;
    const canalEnvio = body.canalEnvio === "whatsapp" || body.canalEnvio === "email" ? String(body.canalEnvio) : null;

    const doc = await prisma.documentoVenta.findUnique({ where: { id: documentoId } });
    if (!doc) {
      return NextResponse.json({ ok: false, error: "Documento no encontrado" }, { status: 404 });
    }

    const updated = await prisma.documentoVenta.update({
      where: { id: documentoId },
      data: {
        estado,
        ...(folio ? { folio } : {}),
        ...(urlPdf ? { urlPdf } : {}),
        ...(canalEnvio ? { canalEnvio } : {}),
        ...(estado === "emitido" || estado === "enviado" ? { fechaEmision: doc.fechaEmision ?? new Date() } : {}),
        ...(canalEnvio ? { fechaEnvio: new Date() } : {}),
      },
    });

    // Sincroniza el campo legacy de la venta (módulo 07 recordatorio).
    if (estado === "emitido" || estado === "enviado" || estado === "pagado") {
      await prisma.venta.update({
        where: { id: doc.ventaId },
        data: { facturada: true, ...(folio ? { folioFactura: folio } : {}) },
      });
    }

    revalidatePath("/admin/facturacion");
    return NextResponse.json({ ok: true, documento: { id: updated.id, estado: updated.estado, folio: updated.folio } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
