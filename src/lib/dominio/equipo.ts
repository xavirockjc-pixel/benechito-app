// Equipo / trabajadores: cargos y movimientos de cuenta.

export const CARGOS = ["operario", "vendedor", "repartidor", "otro"] as const;
export type Cargo = (typeof CARGOS)[number];
export const cargoLabel: Record<string, string> = {
  operario: "Operario",
  vendedor: "Vendedor",
  repartidor: "Repartidor",
  otro: "Otro",
};
export const cargoIcono: Record<string, string> = {
  operario: "🏭",
  vendedor: "🚚",
  repartidor: "🚙",
  otro: "👤",
};

/** Roles de login que corresponden a cada cargo (para enlazar según rubro). */
export function rolesDeCargo(cargo: string): string[] {
  switch (cargo) {
    case "operario": return ["produccion"];
    case "vendedor": return ["vendedor"];
    case "repartidor": return ["chofer", "vendedor"];
    default: return ["produccion", "vendedor", "chofer", "caja", "bodega", "propietario", "admin"];
  }
}

// Movimientos de la cuenta del trabajador.
export const TIPOS_MOV_TRABAJADOR = ["pago", "adelanto", "deuda", "hora_extra", "bono", "descuento", "trato"] as const;
export type TipoMovTrabajador = (typeof TIPOS_MOV_TRABAJADOR)[number];
export const tipoMovTrabajadorLabel: Record<string, string> = {
  pago: "Pago",
  adelanto: "Adelanto",
  deuda: "Queda debiendo",
  hora_extra: "Horas extra",
  bono: "Bono",
  descuento: "Descuento",
  trato: "Trato (producción)",
};
export const tipoMovTrabajadorIcono: Record<string, string> = {
  pago: "💵",
  adelanto: "🤝",
  deuda: "📌",
  hora_extra: "⏱️",
  bono: "🎁",
  descuento: "➖",
  trato: "🍫",
};

/**
 * Signo del movimiento sobre lo que la EMPRESA le debe al trabajador.
 * + = suma a su favor (le deben más): hora_extra, bono.
 * − = baja lo que se le debe (ya recibió o descuenta): pago, adelanto, deuda, descuento.
 * (pago = se le pagó; adelanto = recibió antes; deuda = el trabajador debe; descuento = se le resta)
 */
export function signoMovTrabajador(tipo: string): 1 | -1 {
  return tipo === "hora_extra" || tipo === "bono" || tipo === "trato" ? 1 : -1;
}

// Asistencia: tipo de jornada del día.
export const TIPOS_ASISTENCIA = ["trabajo", "salida_antes", "permiso", "licencia", "falta"] as const;
export type TipoAsistencia = (typeof TIPOS_ASISTENCIA)[number];
export const tipoAsistenciaLabel: Record<string, string> = {
  trabajo: "Trabajó",
  salida_antes: "Salió antes",
  permiso: "Permiso",
  licencia: "Licencia",
  falta: "Falta",
};
export const tipoAsistenciaIcono: Record<string, string> = {
  trabajo: "✅",
  salida_antes: "🏃",
  permiso: "📝",
  licencia: "🏥",
  falta: "❌",
};
/** Color del día en el calendario (fondo / texto Tailwind por tipo). */
export const tipoAsistenciaColor: Record<string, string> = {
  trabajo: "bg-emerald-100 text-emerald-800 border-emerald-300",
  salida_antes: "bg-amber-100 text-amber-800 border-amber-300",
  permiso: "bg-sky-100 text-sky-800 border-sky-300",
  licencia: "bg-violet-100 text-violet-800 border-violet-300",
  falta: "bg-rose-100 text-rose-800 border-rose-300",
};
/** ¿El tipo cuenta como presente (sumó horas)? */
export function tipoPresente(tipo: string): boolean {
  return tipo === "trabajo" || tipo === "salida_antes";
}

/**
 * Horas entre dos horarios "HH:MM" (ej. "08:30" → "18:00" = 9.5).
 * Devuelve 0 si falta alguno o el formato no calza. Cruza medianoche si salida < entrada.
 */
export function horasEntre(entrada?: string | null, salida?: string | null): number {
  const m = (s?: string | null) => {
    const r = /^(\d{1,2}):(\d{2})$/.exec((s ?? "").trim());
    if (!r) return null;
    const h = Number(r[1]), min = Number(r[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };
  const e = m(entrada), s = m(salida);
  if (e == null || s == null) return 0;
  let diff = s - e;
  if (diff < 0) diff += 24 * 60; // cruzó medianoche
  return Math.round((diff / 60) * 100) / 100;
}
