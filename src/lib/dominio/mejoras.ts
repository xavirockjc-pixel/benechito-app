// Mejoras y proyecciones: áreas, prioridades y estados.

export const AREAS_MEJORA = ["general", "produccion", "ventas", "reparto", "inventario", "equipo", "calidad", "marketing"] as const;
export type AreaMejora = (typeof AREAS_MEJORA)[number];
export const areaMejoraLabel: Record<string, string> = {
  general: "General", produccion: "Producción", ventas: "Ventas", reparto: "Reparto",
  inventario: "Inventario", equipo: "Equipo", calidad: "Calidad", marketing: "Marketing",
};
export const areaMejoraIcono: Record<string, string> = {
  general: "🐝", produccion: "🏭", ventas: "💵", reparto: "🚚",
  inventario: "📦", equipo: "👥", calidad: "✅", marketing: "📣",
};

export const PRIORIDADES = ["alta", "media", "baja"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];
export const prioridadLabel: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const prioridadColor: Record<string, string> = {
  alta: "bg-rose-100 text-rose-700 border-rose-300",
  media: "bg-amber-100 text-amber-700 border-amber-300",
  baja: "bg-slate-100 text-slate-600 border-slate-300",
};

export const ESTADOS_MEJORA = ["pendiente", "en_proceso", "hecha"] as const;
export type EstadoMejora = (typeof ESTADOS_MEJORA)[number];
export const estadoMejoraLabel: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En proceso", hecha: "Hecha" };
export const estadoMejoraIcono: Record<string, string> = { pendiente: "⭕", en_proceso: "🔧", hecha: "✅" };

/** Siguiente estado al avanzar (pendiente → en_proceso → hecha → pendiente). */
export function siguienteEstado(estado: string): EstadoMejora {
  if (estado === "pendiente") return "en_proceso";
  if (estado === "en_proceso") return "hecha";
  return "pendiente";
}
