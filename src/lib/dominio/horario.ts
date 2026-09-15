// Horario de acceso de trabajadores. Compara la hora de Chile con la ventana configurada.

/** Hora actual en Chile como minutos del día (0–1439) y texto HH:MM. */
export function horaChile(): { min: number; hhmm: string } {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return { min: h * 60 + m, hhmm };
}

const aMin = (s?: string | null) => {
  if (!s) return null;
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

/** Día de la semana en Chile: 0=Domingo … 6=Sábado. */
export function diaChile(): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

/** Nombres de días (0=Dom … 6=Sáb). */
export const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * ¿Hoy es un día habilitado? `diasCsv` = números separados por coma, 0=Dom … 6=Sáb
 * (ej. "1,2,3,4,5,6" = lunes a sábado). Vacío/nulo = todos los días permitidos.
 */
export function diaPermitido(diasCsv?: string | null): boolean {
  const set = (diasCsv ?? "").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n));
  if (set.length === 0) return true;
  return set.includes(diaChile());
}

/** Etiqueta legible de los días habilitados (ej. "Lun a Sáb", "Lun, Mié, Vie"). */
export function diasLabel(diasCsv?: string | null): string {
  const dias = (diasCsv ?? "").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b);
  if (dias.length === 0 || dias.length === 7) return "todos los días";
  // Rango corrido → "Lun a Sáb"; si no, lista.
  const corrido = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  if (corrido && dias.length >= 3) return `${DIAS_SEMANA[dias[0]]} a ${DIAS_SEMANA[dias[dias.length - 1]]}`;
  return dias.map((d) => DIAS_SEMANA[d]).join(", ");
}

/** ¿La hora de Chile está dentro de [desde, hasta]? */
export function dentroDeHorario(desde?: string | null, hasta?: string | null): boolean {
  const d = aMin(desde), h = aMin(hasta);
  if (d == null || h == null) return true; // sin horario configurado = siempre permitido
  const { min } = horaChile();
  return min >= d && min <= h;
}

/** ¿Hay un permiso temporal vigente para este rol? */
export function hayPermisoExtra(rol: string, hasta?: Date | null, roles?: string | null): boolean {
  if (!hasta) return false;
  if (new Date() >= new Date(hasta)) return false;
  const lista = (roles ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return lista.includes(rol);
}

/** Minutos que faltan para el cierre (o null si no aplica / ya pasó). */
export function minutosHastaCierre(hasta?: string | null): number | null {
  const h = aMin(hasta);
  if (h == null) return null;
  const { min } = horaChile();
  const falta = h - min;
  return falta > 0 ? falta : null;
}
