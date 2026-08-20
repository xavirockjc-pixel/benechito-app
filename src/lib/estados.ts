/** Estados del embudo comercial Benechito (orden = flujo). */
export const ESTADOS = [
  "nuevo",
  "contactado",
  "interesado",
  "visita_agendada",
  "instalacion_pendiente",
  "punto_activo",
  "reposicion",
  "inactivo",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const estadoMeta: Record<
  Estado,
  { label: string; color: string; bg: string }
> = {
  nuevo:                 { label: "Nuevo",                 color: "#17376a", bg: "#dbe6f5" },
  contactado:            { label: "Contactado",            color: "#5a3a22", bg: "#f0e2cf" },
  interesado:            { label: "Interesado",            color: "#d9660b", bg: "#fbe3cb" },
  visita_agendada:       { label: "Visita agendada",       color: "#7a4bbd", bg: "#eadcf7" },
  instalacion_pendiente: { label: "Instalación pendiente", color: "#b8860b", bg: "#f8ecc6" },
  punto_activo:          { label: "Punto activo",          color: "#2f7d34", bg: "#d6ecd7" },
  reposicion:            { label: "Reposición",            color: "#0e7490", bg: "#cdeaf1" },
  inactivo:              { label: "Inactivo",              color: "#8a8a8a", bg: "#e8e8e8" },
};

export function esEstado(v: string): v is Estado {
  return (ESTADOS as readonly string[]).includes(v);
}
