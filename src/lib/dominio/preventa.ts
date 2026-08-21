// Dominio: preventa. Contacto por WhatsApp antes de la ruta (vía n8n + Evolution).
// El resultado alimenta la planificación de la ruta. Ver ARQUITECTURA-ECOSYSTEM.md §11.

export const ESTADOS_PREVENTA = ["enviada", "pedido", "visita", "no_necesita", "sin_respuesta"] as const;
export type EstadoPreventa = (typeof ESTADOS_PREVENTA)[number];

export const estadoPreventaLabel: Record<string, string> = {
  enviada: "Enviada",
  pedido: "Pidió pedido",
  visita: "Pidió visita",
  no_necesita: "No necesita",
  sin_respuesta: "Sin respuesta",
};

export const estadoPreventaColor: Record<string, { color: string; bg: string }> = {
  enviada: { color: "#334155", bg: "#e2e8f0" },
  pedido: { color: "#166534", bg: "#dcfce7" },
  visita: { color: "#1e40af", bg: "#dbeafe" },
  no_necesita: { color: "#92400e", bg: "#fef3c7" },
  sin_respuesta: { color: "#991b1b", bg: "#fee2e2" },
};

export function esEstadoPreventa(v: string): v is EstadoPreventa {
  return (ESTADOS_PREVENTA as readonly string[]).includes(v);
}

/** Mensaje por defecto de preventa. `{nombre}` se reemplaza por el del cliente. */
export const MENSAJE_PREVENTA_DEFAULT =
  "¡Hola {nombre}! 🍦 Somos Benechito. Mañana pasamos por tu sector. ¿Quieres reponer helados o dulces? Respóndenos y te dejamos todo listo. 🙌";
