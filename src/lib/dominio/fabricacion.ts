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
