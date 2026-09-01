// Dominio: ventas y pagos. Una VENTA es el hecho económico; un PAGO es un abono a esa
// venta. Son cosas distintas: el estado de pago se DERIVA de la suma de pagos vs. el total.
// Ver ARQUITECTURA-ECOSYSTEM.md §4.3 y §9.

export const MEDIOS_PAGO = ["efectivo", "transferencia", "tarjeta", "credito", "otro"] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const medioPagoLabel: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  credito: "Crédito",
  otro: "Otro",
};

export const estadoPagoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
  vencido: "Vencido",
};

export const estadoPagoColor: Record<string, { color: string; bg: string }> = {
  pendiente: { color: "#92400e", bg: "#fef3c7" },
  parcial: { color: "#1e40af", bg: "#dbeafe" },
  pagado: { color: "#166534", bg: "#dcfce7" },
  vencido: { color: "#991b1b", bg: "#fee2e2" },
};

/** Deriva el estado de pago a partir del total y lo abonado. */
/** Canales de venta, para separar y llevar historial por área. */
export const CANALES_VENTA = ["local", "terreno", "directa"] as const;
export const canalVentaLabel: Record<string, string> = {
  local: "Local / Sala",
  terreno: "Vendedor / Terreno",
  directa: "Venta directa",
};
export const canalVentaColor: Record<string, { color: string; bg: string }> = {
  local: { color: "#0f7a44", bg: "#e5f2ea" },
  terreno: { color: "#1479c4", bg: "#e6f1fb" },
  directa: { color: "#b45309", bg: "#fbf0e0" },
};

/** Tipos/etiquetas de venta (delivery, exprés ruta, extra a pedido…). */
export const ETIQUETAS_VENTA = ["", "delivery", "expres_ruta", "extra", "otro"] as const;
export const etiquetaVentaLabel: Record<string, string> = {
  delivery: "🛵 Delivery",
  expres_ruta: "⚡ Exprés ruta",
  extra: "➕ Extra a pedido",
  otro: "Otro",
};

export function estadoPagoDe(total: number, pagado: number): "pendiente" | "parcial" | "pagado" {
  if (total > 0 && pagado >= total) return "pagado";
  if (pagado > 0) return "parcial";
  return "pendiente";
}

/** Tipos de documento tributario. */
export const DOCUMENTOS = ["", "boleta", "factura"] as const;
export const documentoLabel: Record<string, string> = {
  "": "Sin documento",
  boleta: "Boleta",
  factura: "Factura",
};

// ===========================================================================
//  EXTENSIÓN FACTURACIÓN — elección de documento al cerrar la venta
// ===========================================================================

/** Opciones de documento que el vendedor elige al cerrar cada venta. */
export const TIPOS_DOCUMENTO = ["boleta", "factura", "sin_documento"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const tipoDocumentoLabel: Record<string, string> = {
  boleta: "Boleta",
  factura: "Factura",
  sin_documento: "Sin documento (interna)",
};

/** IVA Chile. Los totales de boleta/factura se guardan IVA incluido. */
export const IVA_RATE = 0.19;

/** Desglosa un total IVA-incluido en neto + IVA. "sin_documento" no lleva desglose. */
export function desglosarDocumento(
  total: number,
  tipo: string,
): { montoNeto: number | null; iva: number | null; montoTotal: number } {
  if (tipo === "sin_documento" || total <= 0) return { montoNeto: null, iva: null, montoTotal: total };
  const montoNeto = Math.round(total / (1 + IVA_RATE));
  const iva = total - montoNeto;
  return { montoNeto, iva, montoTotal: total };
}

/** Campos tributarios que exige una factura; devuelve los que faltan en el cliente. */
export function faltaParaFactura(neg: {
  rut?: string | null;
  razonSocial?: string | null;
  giro?: string | null;
}): string[] {
  const faltan: string[] = [];
  if (!neg.rut) faltan.push("RUT");
  if (!neg.razonSocial) faltan.push("razón social");
  if (!neg.giro) faltan.push("giro");
  return faltan;
}

/** Mapea la elección al campo legacy Venta.documento ("" = sin documento). */
export function documentoLegacy(tipo: string): string {
  return tipo === "sin_documento" ? "" : tipo;
}

/** Estados del documento tributario (DocumentoVenta.estado). */
export const estadoDocumentoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  emitido: "Emitido",
  enviado: "Enviado",
  pagado: "Pagado",
  rechazado: "Rechazado",
};
