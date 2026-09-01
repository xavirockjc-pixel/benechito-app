// Helper de dominio (lado servidor) para la extensión de Facturación.
// Crea el registro DocumentoVenta y, si hay un flujo n8n configurado, lo avisa
// con TODOS los datos que LibreDTE necesita para emitir hacia el SII.
// Nunca rompe la venta: si n8n/LibreDTE está caído, el documento queda "pendiente".

import { prisma } from "@/lib/prisma";
import { desglosarDocumento } from "@/lib/dominio/ventas";

export type CrearDocumentoOpts = {
  ventaId: string;
  negocioId: string;
  tipo: string; // boleta | factura | sin_documento (u otros del enum)
  total: number;
};

/** Código de DTE del SII: boleta electrónica = 39, factura electrónica = 33. */
export function tipoDTE(tipo: string): number | null {
  if (tipo === "boleta") return 39;
  if (tipo === "factura") return 33;
  return null;
}

/** Crea el DocumentoVenta de una venta ya creada y dispara la emisión si aplica. */
export async function crearDocumentoVenta(opts: CrearDocumentoOpts) {
  const { montoNeto, iva, montoTotal } = desglosarDocumento(opts.total, opts.tipo);

  const doc = await prisma.documentoVenta.create({
    data: {
      ventaId: opts.ventaId,
      negocioId: opts.negocioId,
      tipo: opts.tipo,
      estado: "pendiente",
      montoNeto,
      iva,
      montoTotal,
    },
  });

  // Solo boleta/factura se emiten. "sin_documento" termina acá.
  const codigo = tipoDTE(opts.tipo);
  if (codigo && process.env.SII_N8N_WEBHOOK_URL) {
    const url = process.env.SII_N8N_WEBHOOK_URL;
    const token = process.env.SII_N8N_WEBHOOK_TOKEN ?? "";

    // Datos del receptor (obligatorios para factura; opcionales para boleta).
    const neg = await prisma.negocio.findUnique({
      where: { id: opts.negocioId },
      select: { rut: true, razonSocial: true, giro: true, direccionFacturacion: true, direccion: true, comuna: true, emailFacturacion: true },
    });

    const payload = {
      documentoId: doc.id,
      tipo: opts.tipo,
      tipoDTE: codigo,
      montoNeto,
      iva,
      montoTotal,
      receptor: {
        rut: neg?.rut ?? null,
        razonSocial: neg?.razonSocial ?? null,
        giro: neg?.giro ?? null,
        direccion: neg?.direccionFacturacion || neg?.direccion || null,
        comuna: neg?.comuna ?? null,
        email: neg?.emailFacturacion ?? null,
      },
    };

    // Fire-and-forget: no esperamos ni bloqueamos el cierre de la venta.
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-token": token },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  return doc;
}
