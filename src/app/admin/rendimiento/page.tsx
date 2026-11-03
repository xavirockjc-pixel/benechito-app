import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CalculadoraRendimiento from "./CalculadoraRendimiento";

export const dynamic = "force-dynamic";

/**
 * Calculadora de rendimiento: eliges un insumo y, con lo que rinde (aprendido o
 * puesto a mano), pronostica cuántos baldes/mezclas y cuántas unidades alcanzas con el
 * stock que tienes. Al producir, los insumos se descuentan solos en Producción.
 */
export default async function RendimientoPage() {
  const [materiales, consumoAll, mezclasAgg] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, stock: true },
    }),
    prisma.movimientoMateria.groupBy({ by: ["materiaPrimaId"], where: { tipo: "consumo" }, _sum: { cantidad: true } }),
    prisma.produccionMezcla.aggregate({ _sum: { mezclas: true } }),
  ]);

  const mezclasTot = Number(mezclasAgg._sum.mezclas ?? 0);
  const consumoDe = new Map(consumoAll.map((c) => [c.materiaPrimaId, Math.abs(Number(c._sum.cantidad ?? 0))]));
  const insumos = materiales.map((m) => ({
    id: m.id, nombre: m.nombre, unidad: m.unidad, stock: m.stock,
    porMezcla: mezclasTot > 0 ? Math.round(((consumoDe.get(m.id) ?? 0) / mezclasTot) * 100) / 100 : 0,
  }));

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/admin/materias" className="text-sm font-semibold text-[#1479c4]">← Materias primas</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">🧮 Calculadora de rendimiento</h1>
      <p className="text-sm text-slate-500">Elige un insumo y te digo para cuántos baldes/mezclas y unidades alcanza tu stock.</p>
      <CalculadoraRendimiento insumos={insumos} aprendioDe={mezclasTot} />
    </div>
  );
}
