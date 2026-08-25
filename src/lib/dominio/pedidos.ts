// Dominio: pedidos. Un pedido es la intención de compra; su estado es INDEPENDIENTE
// del estado de pago (eso vive en Venta/Pago). Ver ARQUITECTURA-ECOSYSTEM.md §4.3.

/** Flujo de estados de un pedido (en orden). */
export const ESTADOS_PEDIDO = [
  "solicitud",
  "confirmado",
  "preparacion",
  "listo",
  "entregado",
  "finalizado",
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const estadoPedidoLabel: Record<string, string> = {
  solicitud: "Solicitud",
  confirmado: "Confirmado",
  preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  finalizado: "Finalizado",
};

/** Color de cada estado (para chips en la UI). */
export const estadoPedidoColor: Record<string, { color: string; bg: string }> = {
  solicitud: { color: "#334155", bg: "#e2e8f0" },
  confirmado: { color: "#1e40af", bg: "#dbeafe" },
  preparacion: { color: "#92400e", bg: "#fef3c7" },
  listo: { color: "#5b21b6", bg: "#ede9fe" },
  entregado: { color: "#166534", bg: "#dcfce7" },
  finalizado: { color: "#334155", bg: "#f1f5f9" },
};

export function esEstadoPedido(v: string): v is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(v);
}

/** Canales por los que puede entrar un pedido. */
export const CANALES_PEDIDO = [
  "whatsapp",
  "online",
  "llamada",
  "agenda",
  "instagram",
  "facebook",
  "sala",
  "vendedor",
  "preventa",
  "distribuidor",
] as const;

export const canalPedidoLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  online: "Online / Web",
  llamada: "Llamada",
  agenda: "Agenda",
  instagram: "Instagram",
  facebook: "Facebook",
  sala: "Sala de ventas",
  vendedor: "Vendedor",
  preventa: "Preventa",
  distribuidor: "Distribuidor",
  web: "Online / Web",
};

/** Cómo se entrega el pedido y a qué área se despacha. */
export const ENTREGAS_PEDIDO = ["local", "retiro", "delivery"] as const;
export const entregaPedidoLabel: Record<string, string> = {
  local: "🛒 En local",
  retiro: "🏭 Retiro",
  delivery: "🛵 Delivery / reparto",
};

/** Formatea un monto en pesos chilenos (sin decimales). */
export function fmtCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}
