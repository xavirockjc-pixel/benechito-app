// Normalización de comunas/sectores: une los que son el mismo escrito distinto
// (Lota = LOTA = lota = " Lota "). Clave para agrupar + etiqueta canónica para mostrar.

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
