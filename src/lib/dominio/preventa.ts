// Dominio: preventa. Contacto por WhatsApp antes de la ruta (vía n8n + Evolution).
// El resultado alimenta la planificación de la ruta. Ver ARQUITECTURA-ECOSYSTEM.md §11.

export const ESTADOS_PREVENTA = ["enviada", "pedido", "pospone", "visita", "no_necesita", "sin_respuesta"] as const;
export type EstadoPreventa = (typeof ESTADOS_PREVENTA)[number];

export const estadoPreventaLabel: Record<string, string> = {
  enviada: "Enviada",
  pedido: "Quiere pedido",
  pospone: "Esta vez pasa",
  visita: "Pidió visita",
  no_necesita: "No necesita",
  sin_respuesta: "Sin respuesta",
};

export const estadoPreventaColor: Record<string, { color: string; bg: string }> = {
  enviada: { color: "#334155", bg: "#e2e8f0" },
  pedido: { color: "#166534", bg: "#dcfce7" },
  pospone: { color: "#92400e", bg: "#fef3c7" },
  visita: { color: "#1e40af", bg: "#dbeafe" },
  no_necesita: { color: "#92400e", bg: "#fef3c7" },
  sin_respuesta: { color: "#991b1b", bg: "#fee2e2" },
};

export function esEstadoPreventa(v: string): v is EstadoPreventa {
  return (ESTADOS_PREVENTA as readonly string[]).includes(v);
}

/**
 * Catálogo FIJO que ve el cliente en el seleccionador de preventa de ruta.
 * (No depende del catálogo de tienda; son los productos que se reponen en ruta.)
 */
export const CATALOGO_PREVENTA: { nombre: string; sub: string; img: string }[] = [
  { nombre: "Tú y Yo tradicional", sub: "bolsa 50 u.", img: "/productos/tu-y-yo.jpg" },
  { nombre: "Tú y Yo surtido", sub: "bolsa 50 u.", img: "/productos/tu-y-yo.jpg" },
  { nombre: "Paleta de leche surtida", sub: "bolsa 50 u.", img: "/productos/paletas-leche.jpg" },
  { nombre: "Paleta de agua surtida", sub: "bolsa 50 u.", img: "/productos/paletas-agua.jpg" },
  { nombre: "Postre artesanal surtido", sub: "pack 16 u.", img: "/productos/postres.jpg" },
  { nombre: "Cuchuflís surtidos", sub: "pack 4 u.", img: "/productos/cuchufli-a.jpg" },
  { nombre: "Trufas surtidas", sub: "bolsa 40 u. · $4.000", img: "/productos/trufas.jpg" },
  { nombre: "Bandeja de trufas tradicionales", sub: "40 u. · $4.000", img: "/catalogo/trufa-manjar-nueces.jpg" },
  { nombre: "Bandeja de cocada tradicionales", sub: "$3.500", img: "/productos/cocadas.jpg" },
];

/**
 * Mensaje por defecto de preventa. `{nombre}` se reemplaza por el del cliente y
 * `{link}` por su link personal para responder (elegir productos o decir que pasa).
 */
export const MENSAJE_PREVENTA_DEFAULT =
  "🐝 ¡Hola {nombre}! Somos Benechito 🍦. {dia} pasamos por tu sector.\n¿Qué necesitas? Déjanos tu pedido o dinos si esta vez pasas, aquí 👉 {link}\n¡Gracias! 🙌";
