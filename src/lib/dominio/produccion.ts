// Dominio: fabricación. Una orden de producción (OP) fabrica un producto terminado;
// al terminarse, ingresa a bodega (MovimientoStock tipo "produccion"). Ver §19-22.

export const ESTADOS_OP = ["planificada", "en_proceso", "terminada"] as const;
export type EstadoOP = (typeof ESTADOS_OP)[number];

export const estadoOPLabel: Record<string, string> = {
  planificada: "Planificada",
  en_proceso: "En proceso",
  terminada: "Terminada",
};

export const estadoOPColor: Record<string, { color: string; bg: string }> = {
  planificada: { color: "#334155", bg: "#e2e8f0" },
  en_proceso: { color: "#92400e", bg: "#fef3c7" },
  terminada: { color: "#166534", bg: "#dcfce7" },
};

export function esEstadoOP(v: string): v is EstadoOP {
  return (ESTADOS_OP as readonly string[]).includes(v);
}
