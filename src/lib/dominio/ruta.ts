// Dominio: ruta. El admin planifica una ruta (clientes a visitar) y la asigna a un
// vendedor; el vendedor la ejecuta y marca el resultado de cada parada. Ver §12-13.

export const ESTADOS_RUTA = ["planificada", "en_curso", "cerrada"] as const;
export type EstadoRuta = (typeof ESTADOS_RUTA)[number];

export const estadoRutaLabel: Record<string, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  cerrada: "Cerrada",
};

export const estadoRutaColor: Record<string, { color: string; bg: string }> = {
  planificada: { color: "#334155", bg: "#e2e8f0" },
  en_curso: { color: "#92400e", bg: "#fef3c7" },
  cerrada: { color: "#166534", bg: "#dcfce7" },
};

export function esEstadoRuta(v: string): v is EstadoRuta {
  return (ESTADOS_RUTA as readonly string[]).includes(v);
}

// --- Paradas ---
export const ESTADOS_PARADA = ["pendiente", "vendido", "no_compro", "no_estaba", "visitado"] as const;
export type EstadoParada = (typeof ESTADOS_PARADA)[number];

export const estadoParadaLabel: Record<string, string> = {
  pendiente: "Pendiente",
  vendido: "Vendió",
  no_compro: "No compró",
  no_estaba: "No estaba",
  visitado: "Visitado",
};

export const estadoParadaColor: Record<string, { color: string; bg: string }> = {
  pendiente: { color: "#334155", bg: "#e2e8f0" },
  vendido: { color: "#166534", bg: "#dcfce7" },
  no_compro: { color: "#92400e", bg: "#fef3c7" },
  no_estaba: { color: "#991b1b", bg: "#fee2e2" },
  visitado: { color: "#1e40af", bg: "#dbeafe" },
};

export function esEstadoParada(v: string): v is EstadoParada {
  return (ESTADOS_PARADA as readonly string[]).includes(v);
}
