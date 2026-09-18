import { prisma } from "@/lib/prisma";

/**
 * Rendimiento APRENDIDO por línea: promedio de (unidades ÷ kilos de base) de las
 * últimas tandas. Cada fabricación mejora el estimado — no hay que cargar nada.
 * Devuelve unidades por kilo/litro de base y cuántas tandas se usaron.
 */
export async function rendimientoAprendido(linea: string): Promise<{ porKilo: number; muestras: number }> {
  if (!linea) return { porKilo: 0, muestras: 0 };
  const rows = await prisma.controlCalidad.findMany({
    where: { refId: linea, base: { gt: 0 }, cantidad: { gt: 0 } },
    select: { base: true, cantidad: true },
    orderBy: { fecha: "desc" },
    take: 20,
  });
  if (rows.length === 0) return { porKilo: 0, muestras: 0 };
  const ratios = rows.map((r) => r.cantidad / (r.base as number)).filter((x) => Number.isFinite(x) && x > 0);
  if (ratios.length === 0) return { porKilo: 0, muestras: 0 };
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return { porKilo: Math.round(avg * 100) / 100, muestras: ratios.length };
}

/** Rendimiento aprendido para varias líneas a la vez (para pintar el selector). */
export async function rendimientosPorLinea(lineas: string[]): Promise<Record<string, { porKilo: number; muestras: number }>> {
  const out: Record<string, { porKilo: number; muestras: number }> = {};
  await Promise.all(lineas.map(async (l) => { out[l] = await rendimientoAprendido(l); }));
  return out;
}

export type LineaTurno = {
  linea: string;
  litros: number;      // litros mezclados en el turno
  sabores: string[];   // sabores producidos
  estimado: number;    // unidades ya estimadas (o reales si se contaron) en las tandas
  rendAprendido: number; // u/litro histórico (para comparar)
  muestras: number;    // tandas históricas usadas en el aprendizaje
  tandas: number;      // tandas de este turno
};

export type InsumoTurno = {
  materiaPrimaId: string;
  nombre: string;
  unidad: string;
  categoria: string | null;
  cantidad: number;              // total consumido en el turno
  porLinea: Record<string, number>; // consumo repartido por línea (según el motivo)
};

/**
 * Resumen del turno de producción desde `desde`: cuánto se mezcló por línea
 * (litros, sabores, estimado, rendimiento aprendido) y cuántos insumos se
 * consumieron (palitos, bolsas, kg…) por línea. Base para el cierre y el panel.
 */
export async function resumenTurnoProduccion(desde: Date): Promise<{ porLinea: LineaTurno[]; insumos: InsumoTurno[] }> {
  const [tandas, consumos] = await Promise.all([
    prisma.controlCalidad.findMany({
      where: { clase: "linea", fecha: { gte: desde }, base: { gt: 0 } },
      select: { refId: true, base: true, cantidad: true, depositos: true },
    }),
    prisma.movimientoMateria.findMany({
      where: { tipo: "consumo", fecha: { gte: desde } },
      select: { materiaPrimaId: true, cantidad: true, motivo: true, materiaPrima: { select: { nombre: true, unidad: true, categoria: true } } },
    }),
  ]);

  // Agrupar tandas por línea.
  const map = new Map<string, LineaTurno & { _sab: Set<string> }>();
  for (const t of tandas) {
    const linea = t.refId ?? "";
    if (!linea) continue;
    let row = map.get(linea);
    if (!row) { row = { linea, litros: 0, sabores: [], estimado: 0, rendAprendido: 0, muestras: 0, tandas: 0, _sab: new Set() }; map.set(linea, row); }
    row.litros += (t.base as number) ?? 0;
    row.estimado += t.cantidad ?? 0;
    row.tandas += 1;
    try {
      const deps: { sabor?: string }[] = JSON.parse(t.depositos ?? "[]");
      for (const d of deps) if (d?.sabor) row._sab.add(String(d.sabor).trim());
    } catch { /* depositos sin JSON: se ignora */ }
  }
  const porLinea: LineaTurno[] = [];
  for (const row of map.values()) {
    const rend = await rendimientoAprendido(row.linea);
    row.rendAprendido = rend.porKilo;
    row.muestras = rend.muestras;
    row.sabores = [...row._sab];
    const { _sab, ...clean } = row;
    void _sab;
    porLinea.push(clean);
  }
  porLinea.sort((a, b) => b.litros - a.litros);

  // Agrupar insumos consumidos + repartir por línea (el motivo trae "· <linea> ·").
  const ins = new Map<string, InsumoTurno>();
  for (const c of consumos) {
    let row = ins.get(c.materiaPrimaId);
    if (!row) {
      row = { materiaPrimaId: c.materiaPrimaId, nombre: c.materiaPrima.nombre, unidad: c.materiaPrima.unidad, categoria: c.materiaPrima.categoria, cantidad: 0, porLinea: {} };
      ins.set(c.materiaPrimaId, row);
    }
    row.cantidad += c.cantidad;
    const m = (c.motivo ?? "").match(/·\s*([a-z_]+)\s*·/i);
    const linea = m?.[1] ?? "otros";
    row.porLinea[linea] = (row.porLinea[linea] ?? 0) + c.cantidad;
  }
  const insumos = [...ins.values()].sort((a, b) => (a.categoria ?? "").localeCompare(b.categoria ?? "") || a.nombre.localeCompare(b.nombre));

  return { porLinea, insumos };
}
