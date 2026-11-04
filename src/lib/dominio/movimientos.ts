// Dominio: clasificación de los movimientos de bodega por sección y motivo.
// Un movimiento es ENTRADA (llega a bodega) o SALIDA (sale de bodega), y la
// salida lleva un MOTIVO (camión, local, distribuidor, venta, merma, otro).

export type MovLike = { tipo: string; motivo: string | null };

/** Motivo normalizado de un movimiento (para agrupar salidas). */
export function motivoDe(m: MovLike): string {
  if (m.tipo === "merma") return "merma";
  if (m.tipo === "salida") return m.motivo || "otro";
  return m.motivo || "";
}

/** ¿El movimiento es una salida de bodega (incluye merma)? */
export const esSalida = (m: MovLike) => m.tipo === "salida" || m.tipo === "merma";
/** ¿El movimiento es una entrada a bodega (incluye mixtos armados)? */
export const esEntrada = (m: MovLike) => m.tipo === "entrada" || m.tipo === "mixto";
/** Corrección de conteo (ajuste manual del stock real). */
export const esCorreccion = (m: MovLike) => m.tipo === "ajuste";

// Etiqueta + emoji por motivo de salida (orden de aparición en el registro).
export const MOTIVOS_SALIDA = ["camion", "local", "distribuidor", "venta", "merma", "otro"] as const;
export const MOTIVO_INFO: Record<string, { emoji: string; label: string }> = {
  camion: { emoji: "🚚", label: "Camión / ruta" },
  local: { emoji: "🏪", label: "Local / sala" },
  distribuidor: { emoji: "🏭", label: "Distribuidor" },
  venta: { emoji: "💰", label: "Venta" },
  merma: { emoji: "🗑️", label: "Merma" },
  otro: { emoji: "📦", label: "Otro" },
};

// Motivos que el bodeguero elige al registrar una "salida con destino" a mano
// (el camión se registra solo desde la app del vendedor al cargar).
export const MOTIVOS_SALIDA_MANUAL = ["venta", "distribuidor", "local", "otro"] as const;

export function motivoLabel(motivo: string): { emoji: string; label: string } {
  return MOTIVO_INFO[motivo] ?? { emoji: "📦", label: motivo || "Otro" };
}
