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

// Tipos/líneas de producción, para la receta base y los agregados.
export const LINEAS_PRODUCCION = ["tuyyo", "paletas", "cremas", "paletas_premium", "postres_500", "cassatas", "trufas", "cuchufli"] as const;

export const lineaLabel: Record<string, string> = {
  tuyyo: "Tú y yo",
  paletas: "Paletas",
  cremas: "Cremas (helado batido)",
  paletas_premium: "Paletas premium",
  postres_500: "Postres 500ml",
  cassatas: "Cassatas",
  trufas: "Trufas",
  cuchufli: "Cuchuflí",
  // compatibilidad con datos antiguos
  trufa: "Trufas",
  helado: "Helados",
  paleta: "Paletas",
  postre: "Postres",
  proteico: "Proteicos",
};

/**
 * Perfil de cada producto para el reporte de producción: qué campos mostrar y su ícono.
 * No todos son iguales: los de moldeo (tú y yo, paletas) van por litros de mezcla;
 * las cremas llevan overrun (batido); trufas/cuchuflís/postres van por unidad.
 */
export type PerfilLinea = { icono: string; color: string; litros: boolean; overrun: boolean; hint?: string };
export const PERFIL_LINEA: Record<string, PerfilLinea> = {
  tuyyo:          { icono: "🍦", color: "#1479c4", litros: true,  overrun: false, hint: "Moldeo: pon los litros de mezcla; el sistema estima las unidades." },
  paletas:        { icono: "🧊", color: "#0ea5e9", litros: true,  overrun: false, hint: "Agua o leche. Moldeo por litros de mezcla." },
  paletas_premium:{ icono: "⭐", color: "#a855f7", litros: true,  overrun: false, hint: "Moldeo por litros de mezcla." },
  cremas:         { icono: "🍨", color: "#ec4899", litros: true,  overrun: true,  hint: "Pasteurizado + maduración + overrun (batido)." },
  cassatas:       { icono: "🎂", color: "#f59e0b", litros: true,  overrun: true,  hint: "Lleva overrun (batido)." },
  postres_500:    { icono: "🍮", color: "#8b5cf6", litros: false, overrun: false, hint: "Por unidad / formato (500 ml)." },
  trufas:         { icono: "🍫", color: "#92400e", litros: false, overrun: false, hint: "Dulce: por unidad, por sabor." },
  cuchufli:       { icono: "🥖", color: "#d97706", litros: false, overrun: false, hint: "Dulce: por unidad, por sabor/relleno." },
};
/** Orden en que se muestran los productos (helados primero, dulces al final). */
export const ORDEN_LINEAS = ["tuyyo", "paletas", "paletas_premium", "cremas", "cassatas", "postres_500", "trufas", "cuchufli"];

export const turnoLabel: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  libre: "Libre",
};
