// Notas rápidas (asistidas por voz) desde cualquier app.
// Reutiliza áreas/prioridades de "mejoras" y agrega tipos de nota.

import { areaMejoraLabel, areaMejoraIcono } from "./mejoras";

export const TIPOS_NOTA = ["tarea", "observacion", "recordatorio", "idea"] as const;
export type TipoNota = (typeof TIPOS_NOTA)[number];
export const tipoNotaLabel: Record<string, string> = {
  tarea: "Tarea", observacion: "Observación", recordatorio: "Recordatorio", idea: "Idea",
};
export const tipoNotaIcono: Record<string, string> = {
  tarea: "✅", observacion: "👁️", recordatorio: "🔔", idea: "💡",
};

// Áreas de nota = áreas de mejora + caja y local (puntos de venta directos).
export const AREAS_NOTA = [
  "general", "produccion", "ventas", "caja", "reparto", "inventario", "equipo", "calidad", "marketing",
] as const;
export type AreaNota = (typeof AREAS_NOTA)[number];
export const areaNotaLabel: Record<string, string> = {
  ...areaMejoraLabel, caja: "Caja / Local",
};
export const areaNotaIcono: Record<string, string> = {
  ...areaMejoraIcono, caja: "🧾",
};

/** Detecta el TIPO de nota por palabras clave. */
export function detectaTipoNota(t: string): TipoNota {
  if (/(recuerda|recordar|recordatorio|no olvidar|acordarse|avisar)/.test(t)) return "recordatorio";
  if (/(hay que|tengo que|hacer|comprar|llamar|arreglar|pedir|revisar|pagar|tarea)/.test(t)) return "tarea";
  if (/(idea|proponer|propongo|se podria|podriamos|deberiamos|mejorar)/.test(t)) return "idea";
  return "observacion";
}

/** Detecta ÁREA por palabras clave (igual criterio que mejoras + caja/local). */
export function detectaAreaNota(t: string): AreaNota {
  if (/(caja|local|mostrador|venta directa|boleta|vuelto)/.test(t)) return "caja";
  if (/(produccion|fabrica|maquina|selladora|linea|horno|lote|receta)/.test(t)) return "produccion";
  if (/(venta|vender|pos|cliente compra|preventa|pedido)/.test(t)) return "ventas";
  if (/(reparto|despacho|ruta|entrega|vehiculo|camion)/.test(t)) return "reparto";
  if (/(inventario|stock|bodega|insumo|materia)/.test(t)) return "inventario";
  if (/(equipo|trabajador|personal|contratar|turno)/.test(t)) return "equipo";
  if (/(calidad|bpm|higiene|inocuidad|epp)/.test(t)) return "calidad";
  if (/(marketing|redes|instagram|facebook|publicidad|post)/.test(t)) return "marketing";
  return "general";
}

/** Detecta PRIORIDAD por palabras clave. */
export function detectaPrioridadNota(t: string): "alta" | "media" | "baja" {
  if (/(urgente|urgentemente|importante|cuanto antes|prioridad alta|ya mismo)/.test(t)) return "alta";
  if (/(cuando se pueda|sin apuro|no urge|prioridad baja|algun dia)/.test(t)) return "baja";
  return "media";
}

export function normalizaTexto(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
