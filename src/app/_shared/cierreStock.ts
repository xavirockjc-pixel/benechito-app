import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dominio/empresa";

export type FilaCierre = {
  id: string;       // "prod:<id>"
  nombre: string;
  deberia: number;  // stock teórico actual (lo que el sistema cree que hay)
  entro: number;    // entró en el período (producción/recepción/ajuste +)
  salio: number;    // salió en el período (ventas + mermas + ajustes -)
};

/**
 * Filas para el cierre guiado de mercadería de una zona (bodega o sala/local).
 * "Debería quedar" = stock teórico actual; entró/salió = movimientos del período
 * (desde el último "empezar nuevo día"). Sirve para contar lo real y ver la diferencia.
 */
export async function filasCierreStock(zona: "bodega" | "sala"): Promise<FilaCierre[]> {
  const tipo = zona === "sala" ? "sala" : "bodega";
  const ubic =
    (await prisma.ubicacion.findFirst({ where: { tipo } })) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } }));
  if (!ubic) return [];
  const desde = await inicioDelDia();

  const [productos, stock, entradas, salidas] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true, ...(zona === "bodega" ? { soloLocal: false } : {}) },
      orderBy: [{ linea: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true },
    }),
    prisma.stock.findMany({ where: { ubicacionId: ubic.id } }),
    prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { ubicacionDestinoId: ubic.id, fecha: { gte: desde } } }),
    prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { ubicacionOrigenId: ubic.id, fecha: { gte: desde } } }),
  ]);

  const stockDe = new Map(stock.map((s) => [s.productoId, s.cantidad]));
  const entroDe = new Map(entradas.map((e) => [e.productoId, Number(e._sum.cantidad ?? 0)]));
  const salioDe = new Map(salidas.map((s) => [s.productoId, Number(s._sum.cantidad ?? 0)]));

  return productos.map((p) => ({
    id: `prod:${p.id}`,
    nombre: p.nombre,
    deberia: stockDe.get(p.id) ?? 0,
    entro: entroDe.get(p.id) ?? 0,
    salio: salioDe.get(p.id) ?? 0,
  }));
}
