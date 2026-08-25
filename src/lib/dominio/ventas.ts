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
