// Helper de dominio (lado servidor) para la extensión de Facturación.
// Crea el registro DocumentoVenta y, si hay un flujo n8n configurado, lo avisa
// con TODOS los datos que LibreDTE necesita para emitir hacia el SII.
// Nunca rompe la venta: si n8n/LibreDTE está caído, el documento queda "pendiente"
// y se puede reintentar desde /admin/facturacion.

import { prisma } from "@/lib/prisma";
import { desglosarDocumento } from "@/lib/dominio/ventas";

export type LineaDocumento = {
  productoId?: string | null;
  nombre?: string;
  cantidad: number;
  precioUnit: number;
};

export type CrearDocumentoOpts = {
  ventaId: string;
  negocioId: string;
  tipo: string; // boleta | factura | sin_documento (u otros del enum)
  total: number;
  /** Detalle de líneas: se guarda como VentaItem y viaja en el DTE. */
  items?: LineaDocumento[];
};

/** Código de DTE del SII: boleta electrónica = 39, factura electrónica = 33. */
export function tipoDTE(tipo: string): number | null {
  if (tipo === "boleta") return 39;
  if (tipo === "factura") return 33;
  return null;
}

/** Completa los nombres de las líneas que vienen solo con productoId. */
async function resolverNombres(items: LineaDocumento[]): Promise<{ productoId: string | null; nombre: string; cantidad: number; precioUnit: number }[]> {
  const sinNombre = items.filter((i) => !i.nombre && i.productoId).map((i) => i.productoId as string);
  const nombres = new Map<string, string>();
  if (sinNombre.length > 0) {
    const prods = await prisma.producto.findMany({ where: { id: { in: sinNombre } }, select: { id: true, nombre: true, formato: true } });
    for (const p of prods) nombres.set(p.id, p.formato ? `${p.nombre} ${p.formato}` : p.nombre);
  }
  return items.map((i) => ({
    productoId: i.productoId ?? null,
    nombre: i.nombre || (i.productoId ? nombres.get(i.productoId) ?? "Producto" : "Producto"),
    cantidad: i.cantidad,
    precioUnit: i.precioUnit,
  }));
}

/** Arma y dispara el aviso a n8n (fire-and-forget) para emitir el DTE de un documento. */
async function dispararEmision(documentoId: string) {
  const url = process.env.SII_N8N_WEBHOOK_URL;
  if (!url) return;
  const token = process.env.SII_N8N_WEBHOOK_TOKEN ?? "";

  const doc = await prisma.documentoVenta.findUnique({
    where: { id: documentoId },
    include: {
      negocio: { select: { rut: true, razonSocial: true, giro: true, direccionFacturacion: true, direccion: true, comuna: true, emailFacturacion: true } },
      venta: { include: { items: true } },
    },
  });
  if (!doc) return;
  const codigo = tipoDTE(doc.tipo);
  if (!codigo) return; // sin_documento y otros no se emiten

  const payload = {
    documentoId: doc.id,
    tipo: doc.tipo,
    tipoDTE: codigo,
    montoNeto: doc.montoNeto === null ? null : Number(doc.montoNeto),
    iva: doc.iva === null ? null : Number(doc.iva),
    montoTotal: Number(doc.montoTotal),
    receptor: {
      rut: doc.negocio.rut ?? null,
      razonSocial: doc.negocio.razonSocial ?? null,
      giro: doc.negocio.giro ?? null,
      direccion: doc.negocio.direccionFacturacion || doc.negocio.direccion || null,
      comuna: doc.negocio.comuna ?? null,
      email: doc.negocio.emailFacturacion ?? null,
    },
    // Detalle real de la venta (si no hay líneas, el flujo usa una línea genérica).
    detalle: doc.venta.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precioUnit: Number(i.precioUnit) })),
  };

  // Fire-and-forget: no esperamos ni bloqueamos el cierre de la venta.
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-token": token },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/** Crea el DocumentoVenta de una venta ya creada y dispara la emisión si aplica. */
export async function crearDocumentoVenta(opts: CrearDocumentoOpts) {
  const { montoNeto, iva, montoTotal } = desglosarDocumento(opts.total, opts.tipo);

  // Guarda el detalle de líneas de la venta (sirve para el DTE y el comprobante).
  if (opts.items && opts.items.length > 0) {
    const lineas = await resolverNombres(opts.items.filter((i) => i.cantidad > 0 && i.precioUnit >= 0));
    if (lineas.length > 0) {
      await prisma.ventaItem.createMany({
        data: lineas.map((l) => ({ ventaId: opts.ventaId, productoId: l.productoId, nombre: l.nombre, cantidad: l.cantidad, precioUnit: l.precioUnit })),
      });
    }
  }

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

  await dispararEmision(doc.id);
  return doc;
}

/** Reintenta la emisión de un documento pendiente o rechazado (desde el panel). */
export async function reemitirDocumento(documentoId: string) {
  const doc = await prisma.documentoVenta.findUnique({ where: { id: documentoId }, select: { estado: true } });
  if (!doc || !["pendiente", "rechazado"].includes(doc.estado)) return;
  await dispararEmision(documentoId);
}
