// Agenda / despacho: constantes y etiquetas compartidas por vendedor, central y departamentos.

export const CANALES = ["whatsapp", "facebook", "instagram", "manual"] as const;
export type Canal = (typeof CANALES)[number];

export const canalLabel: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  manual: "Manual",
};
export const canalIcono: Record<string, string> = {
  whatsapp: "💬",
  facebook: "📘",
  instagram: "📸",
  manual: "✍️",
};

export const DESTINOS = ["local", "bodega", "reparto"] as const;
export type Destino = (typeof DESTINOS)[number];

export const destinoLabel: Record<string, string> = {
  local: "Local",
  bodega: "Bodega",
  reparto: "Reparto (delivery)",
  central: "Central (sin despachar)",
};
export const destinoIcono: Record<string, string> = {
  local: "🏪",
  bodega: "📦",
  reparto: "🛵",
  central: "🏛️",
};

export const estadoAgendaLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En preparación",
  hecho: "Listo / entregado",
  cancelado: "Cancelado",
};

/** Convierte "hoy" | "manana" | "yyyy-mm-dd" en un Date a las 12:00. */
export function fechaDesde(valor: string): Date {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  if (!valor || valor === "hoy") return hoy;
  if (valor === "manana") {
    const m = new Date(hoy);
    m.setDate(m.getDate() + 1);
    return m;
  }
  const [y, mo, d] = valor.split("-").map(Number);
  if (y && mo && d) return new Date(y, mo - 1, d, 12, 0, 0, 0);
  return hoy;
}

/** Etiqueta corta de fecha (Hoy / Mañana / "lun 25 ago"). */
export function fechaCorta(f: Date): string {
  const d = new Date(f);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(d);
  dia.setHours(0, 0, 0, 0);
  const diff = Math.round((dia.getTime() - hoy.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });
}
