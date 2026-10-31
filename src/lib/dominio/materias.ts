// Materias primas y materiales: constantes y etiquetas compartidas.

export const CATEGORIAS = ["insumo", "material"] as const;
export const categoriaLabel: Record<string, string> = {
  insumo: "Materia prima",
  material: "Material / envase",
};
export const categoriaIcono: Record<string, string> = { insumo: "🧪", material: "📦" };

// Subtipos de materia prima (para agrupar en producción: esencias, colores, polvos…).
export const SUBTIPOS = ["esencia", "colorante", "otro", "base"] as const;
export const subtipoLabel: Record<string, string> = {
  esencia: "Esencias y sabores",
  colorante: "Colorantes",
  otro: "Polvos y otros (dextrosa, estabilizante…)",
  base: "Bases (azúcar, leche…)",
};
export const subtipoIcono: Record<string, string> = { esencia: "🧴", colorante: "🎨", otro: "🧂", base: "🥛" };

export const UNIDADES = ["kg", "g", "l", "ml", "unidad"] as const;
export const unidadLabel: Record<string, string> = {
  kg: "kg",
  g: "g",
  l: "L",
  ml: "ml",
  unidad: "u.",
};

export const tipoMovMateriaLabel: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  consumo: "Consumo",
  merma: "Merma",
  ajuste: "Ajuste",
};

/** Formatea una cantidad con su unidad (sin decimales innecesarios). */
export function fmtCant(n: number, unidad?: string | null): string {
  const num = Number(n);
  const s = Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
  return unidad ? `${s} ${unidadLabel[unidad] ?? unidad}` : s;
}

/** ¿Está en o bajo el mínimo? (con stockMinimo > 0). */
export function stockBajo(stock: number, minimo: number): boolean {
  return minimo > 0 && stock <= minimo;
}

/**
 * Pronóstico de duración de un insumo: cuántos DÍAS durará el stock al ritmo de
 * consumo observado (consumoPeriodo en `dias`). Devuelve null si aún no hay consumo
 * registrado (no se puede estimar). El cerebro lo usa para avisar "va a faltar".
 */
export function diasRestantes(stock: number, consumoPeriodo: number, dias: number): number | null {
  if (consumoPeriodo <= 0 || dias <= 0) return null;
  const porDia = consumoPeriodo / dias;
  if (porDia <= 0) return null;
  return Math.max(0, Math.floor(stock / porDia));
}

/** Consumo promedio por MEZCLA (lo que el cerebro "aprende"): total usado / total mezclas. */
export function promedioPorMezcla(consumoTotal: number, mezclasTotal: number): number | null {
  if (mezclasTotal <= 0) return null;
  return consumoTotal / mezclasTotal;
}

/** Color/urgencia del pronóstico según días restantes. */
export function urgenciaDuracion(dias: number | null): "sin_datos" | "ok" | "pronto" | "critico" {
  if (dias == null) return "sin_datos";
  if (dias <= 3) return "critico";
  if (dias <= 10) return "pronto";
  return "ok";
}
