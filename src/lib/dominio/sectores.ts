// Normalización de comunas/sectores: une los que son el mismo escrito distinto
// (Lota = LOTA = lota = " Lota ") Y agrupa comunas vecinas en una sola RUTA real
// (San Pedro de la Paz = San Pedro; Hualpén/Chiguayante/Talcahuano van juntas; etc.).

/** Clave normalizada para agrupar (minúsculas, sin acentos, espacios colapsados). */
export function claveSector(s?: string | null): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Etiqueta canónica (Título) de un sector para mostrar en la UI. */
export function etiquetaSector(s?: string | null): string {
  const c = (s ?? "").replace(/\s+/g, " ").trim();
  if (!c) return "Sin sector";
  return c.toLowerCase().split(" ").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

/**
 * RUTAS reales del vendedor. Cada ruta agrupa las comunas que se recorren juntas,
 * aunque el cliente las haya escrito distinto. `comunas` son claves normalizadas
 * (minúsculas, sin acento). Para agregar una comuna a una ruta, súmala aquí.
 */
export const RUTAS: { clave: string; label: string; comunas: string[] }[] = [
  { clave: "coronel", label: "Coronel", comunas: ["coronel"] },
  { clave: "lota", label: "Lota", comunas: ["lota", "lota alto", "lota bajo"] },
  { clave: "san pedro", label: "San Pedro", comunas: ["san pedro", "san pedro de la paz", "san pedro de la paz"] },
  { clave: "talcahuano", label: "Talcahuano · Hualpén · Chiguayante", comunas: ["talcahuano", "hualpen", "chiguayante", "penco"] },
  { clave: "santa juana", label: "Santa Juana", comunas: ["santa juana"] },
  { clave: "laja", label: "Laja", comunas: ["laja", "san rosendo"] },
  { clave: "los angeles", label: "Los Ángeles · Nacimiento", comunas: ["los angeles", "nacimiento", "negrete", "cabrero", "yumbel"] },
];

/**
 * Resuelve a qué RUTA pertenece una comuna/sector escrito de cualquier forma.
 * Si no calza con ninguna ruta conocida, devuelve la comuna como su propia ruta
 * (así nunca se pierde un cliente: queda en un chip con su propio nombre).
 */
export function rutaDeComuna(comuna?: string | null): { clave: string; label: string } {
  const c = claveSector(comuna);
  if (!c) return { clave: "", label: "Sin sector" };
  for (const r of RUTAS) {
    if (r.comunas.some((x) => c === x || c.includes(x))) return { clave: r.clave, label: r.label };
  }
  return { clave: c, label: etiquetaSector(comuna) };
}
