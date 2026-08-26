// Secciones del catálogo comercial. Separan los productos por su canal/uso:
// - propio: los que se fabrican (producción)
// - distribucion: productos de distribución que vende el local
// - ruta: distribución en ruta / reventas
// - promo: promociones y combos

export const SECCIONES_CATALOGO = ["propio", "distribucion", "ruta", "promo"] as const;
export type SeccionCatalogo = (typeof SECCIONES_CATALOGO)[number];

export const seccionCatalogoLabel: Record<string, string> = {
  propio: "Fabricación (propios)",
  distribucion: "Distribución (local)",
  ruta: "Ruta / reventa",
  promo: "Promos y combos",
};

export const seccionCatalogoIcono: Record<string, string> = {
  propio: "🏭",
  distribucion: "🏪",
  ruta: "🚚",
  promo: "🎁",
};

export const seccionCatalogoColor: Record<string, string> = {
  propio: "#0f766e",
  distribucion: "#1479c4",
  ruta: "#d97706",
  promo: "#be185d",
};
