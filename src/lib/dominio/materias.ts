// Materias primas y materiales: constantes y etiquetas compartidas.

export const CATEGORIAS = ["insumo", "material"] as const;
export const categoriaLabel: Record<string, string> = {
  insumo: "Materia prima",
  material: "Material / envase",
};
export const categoriaIcono: Record<string, string> = { insumo: "🧪", material: "📦" };

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
