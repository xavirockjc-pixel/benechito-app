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

// ---- Acciones inteligentes: convertir la nota en algo aplicable ----
export const ACCIONES_NOTA = {
  ninguna: { label: "Nota", icon: "📝", verbo: "" },
  stock_entrada: { label: "Sumar a stock", icon: "📥", verbo: "Sumar" },
  stock_salida: { label: "Descontar de stock", icon: "📤", verbo: "Descontar" },
  reponer: { label: "Reponer / comprar", icon: "🔁", verbo: "Reponer" },
  asistencia: { label: "Registrar asistencia", icon: "📅", verbo: "Registrar" },
} as const;
export type AccionNota = keyof typeof ACCIONES_NOTA;

/** Detecta si la nota implica una acción (asistencia, stock o reposición). */
export function detectaAccionNota(t: string): AccionNota {
  // Asistencia: "Isaías trabajó el lunes", "vino a trabajar", "hizo turno"
  if (/(trabaj[oó]|vino a trabajar|hizo (el )?turno|estuvo trabajando|asisti[oó]|jornada de)/.test(t)) return "asistencia";
  // Entra mercadería
  if (/(llego|llegaron|recibi|recibimos|entro|entraron|compre|compramos|me trajeron|ingreso de|nos dejaron)/.test(t)) return "stock_entrada";
  // Sale / se vendió / se usó
  if (/(se vendio|vendimos|vendi|se saco|sacamos|se uso|usamos|se gasto|gastamos|salieron|se ocuparon|se consumio|despachamos)/.test(t)) return "stock_salida";
  // Se acaba / falta / hay que reponer
  if (/(se termin|se acab|falta|faltan|quedan pocos|casi no queda|hay que comprar|hay que pedir|reponer|se agot|por acabar|ultim(a|o)s? )/.test(t)) return "reponer";
  return "ninguna";
}

/** Extrae las horas mencionadas ("8 horas", "6 h"). */
export function detectaHoras(t: string): number | null {
  const m = t.match(/(\d+)\s*(h\b|horas?|hrs?)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Calza un nombre de persona dictado con un trabajador (por palabra completa). */
export function matchTrabajador(
  textoNorm: string,
  trabajadores: { id: string; nombre: string }[],
): { id: string; nombre: string } | null {
  const palabras = new Set(textoNorm.split(/[^a-z0-9]+/).filter(Boolean));
  let mejor: { id: string; nombre: string } | null = null;
  let mejorLen = 0;
  for (const w of trabajadores) {
    for (const tok of normalizaTexto(w.nombre).split(/[^a-z0-9]+/).filter((x) => x.length >= 3)) {
      if (palabras.has(tok) && tok.length > mejorLen) {
        mejorLen = tok.length; mejor = { id: w.id, nombre: w.nombre };
      }
    }
  }
  return mejor;
}

const NUM_PALABRA: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100,
};
/** Extrae la primera cantidad (dígitos o palabra) del texto. */
export function detectaCantidad(t: string): number | null {
  const m = t.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  for (const [pal, val] of Object.entries(NUM_PALABRA)) {
    if (new RegExp(`\\b${pal}\\b`).test(t)) return val;
  }
  return null;
}

/** Fecha relativa simple → Date (para tareas programadas). */
/**
 * Detecta una hora en el texto: "a las 15", "a las 15:30", "3 de la tarde",
 * "8 de la mañana", "20 hrs", "mediodía". Devuelve {h, m} en 24h, o null.
 */
export function detectaHoraNota(t: string): { h: number; m: number } | null {
  if (/\bmediodia\b/.test(t)) return { h: 12, m: 0 };
  if (/\bmedianoche\b/.test(t)) return { h: 0, m: 0 };
  // "a las 15", "a las 3:30", "a las 3 y media", o "20 hrs/horas"
  const m = t.match(/\ba\s*las?\s*(\d{1,2})(?::(\d{2}))?/) || t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:hrs?|horas?)\b/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  if (/\by\s*media\b/.test(t) && !m[2]) min = 30;
  if (/\by\s*cuarto\b/.test(t) && !m[2]) min = 15;
  // Franja del día para pasar a 24h.
  if (/(de la tarde|en la tarde|pm)/.test(t) && h >= 1 && h <= 11) h += 12;
  else if (/(de la noche|en la noche)/.test(t) && h >= 1 && h <= 11) h += 12;
  else if (/(de la manana|en la manana|am)/.test(t) && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

export function detectaFechaNota(t: string): Date | null {
  const ahora = new Date();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hora = detectaHoraNota(t);

  // 1) Día base (si se menciona uno). diaExplicito controla si empujamos a mañana.
  let base: Date | null = null;
  let diaExplicito = true;
  if (/\bhoy\b/.test(t)) base = new Date(hoy);
  else if (/(pasado manana)/.test(t)) { base = new Date(hoy); base.setDate(base.getDate() + 2); }
  else if (/\bmanana\b/.test(t)) { base = new Date(hoy); base.setDate(base.getDate() + 1); }
  else if (/(proxima semana|otra semana)/.test(t)) { base = new Date(hoy); base.setDate(base.getDate() + 7); }
  else {
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    for (let i = 0; i < 7; i++) if (t.includes(dias[i])) { base = new Date(hoy); const diff = (i - base.getDay() + 7) % 7 || 7; base.setDate(base.getDate() + diff); break; }
  }
  // 2) Solo hora, sin día → hoy (y si ya pasó, mañana).
  if (!base && hora) { base = new Date(hoy); diaExplicito = false; }
  if (!base) return null;

  // 3) Aplica la hora (si hay).
  if (hora) {
    base.setHours(hora.h, hora.m, 0, 0);
    if (!diaExplicito && base < ahora) base.setDate(base.getDate() + 1); // "a las 8" ya pasada → mañana
  }
  return base;
}

/** Calza el ítem dictado con un producto del catálogo (por tokens en común). */
export function matchProducto(
  textoNorm: string,
  productos: { id: string; nombre: string }[],
): { id: string; nombre: string } | null {
  let mejor: { id: string; nombre: string } | null = null;
  let mejorScore = 0;
  for (const p of productos) {
    const tokens = normalizaTexto(p.nombre).split(/\s+/).filter((w) => w.length >= 3);
    if (tokens.length === 0) continue;
    const aciertos = tokens.filter((w) => textoNorm.includes(w)).length;
    const score = aciertos / tokens.length + aciertos * 0.01; // prioriza mayor cobertura
    if (aciertos > 0 && score > mejorScore) { mejorScore = score; mejor = { id: p.id, nombre: p.nombre }; }
  }
  return mejorScore >= 0.5 ? mejor : null; // al menos la mitad de las palabras del producto
}
