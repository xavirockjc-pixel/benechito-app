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
