import { prisma } from "@/lib/prisma";
import { lineaLabel, PERFIL_LINEA } from "./produccion";

/** Productos que hoy se costean (dulces vendrán después). */
export const LINEAS_COSTEABLES = ["tuyyo", "paletas", "postres_500"] as const;

export type CosteoLinea = {
  linea: string;
  label: string;
  icono: string;
  color: string;
  producidas: number; // unidades producidas en el período
  vendidas: number; // unidades vendidas en el período
  pagoUnit: number; // pago estimado por unidad (mano de obra)
  precioVenta: number; // precio de venta por unidad
  costoReal: number; // costo real por unidad (insumos + otros)
  pagoEstimado: number; // producidas × pagoUnit
  gananciaUnit: number; // precioVenta − costoReal − pagoUnit
  margenPct: number; // gananciaUnit / precioVenta
  gananciaVendidas: number; // vendidas × gananciaUnit
  ingresoVendidas: number; // vendidas × precioVenta
};

const num = (d: unknown) => Number(d ?? 0) || 0;

/**
 * Arma el costeo por línea en un rango de fechas: cuánto se produjo (ControlCalidad
 * clase=linea), cuánto se vendió (MovimientoStock tipo venta → Producto.linea) y
 * los valores por unidad que cargó el dueño (CostoLinea). Calcula pago estimado,
 * ganancia por unidad, margen % y ganancia según lo vendido.
 */
export async function costeoLineas(desde: Date, hasta: Date): Promise<CosteoLinea[]> {
  const lineas = [...LINEAS_COSTEABLES];

  const [prod, costos, ventasMov] = await Promise.all([
    prisma.controlCalidad.groupBy({
      by: ["refId"],
      _sum: { cantidad: true },
      where: { clase: "linea", refId: { in: lineas }, fecha: { gte: desde, lt: hasta } },
    }),
    prisma.costoLinea.findMany({ where: { linea: { in: lineas } } }),
    prisma.movimientoStock.groupBy({
      by: ["productoId"],
      _sum: { cantidad: true },
      where: { tipo: "venta", fecha: { gte: desde, lt: hasta } },
    }),
  ]);

  const prodDe = new Map(prod.map((p) => [p.refId ?? "", num(p._sum.cantidad)]));
  const costoDe = new Map(costos.map((c) => [c.linea, c]));

  // Ventas por línea: mapear productoId → línea.
  const ids = ventasMov.map((v) => v.productoId).filter((x): x is string => !!x);
  const productos = ids.length
    ? await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, linea: true } })
    : [];
  const lineaDe = new Map(productos.map((p) => [p.id, p.linea]));
  const vendidasDe = new Map<string, number>();
  for (const v of ventasMov) {
    const l = v.productoId ? lineaDe.get(v.productoId) : undefined;
    if (l && lineas.includes(l as (typeof LINEAS_COSTEABLES)[number])) {
      vendidasDe.set(l, (vendidasDe.get(l) ?? 0) + Math.abs(num(v._sum.cantidad)));
    }
  }

  return lineas.map((linea) => {
    const c = costoDe.get(linea);
    const pagoUnit = num(c?.pagoUnit);
    const precioVenta = num(c?.precioVenta);
    const costoReal = num(c?.costoReal);
    const producidas = prodDe.get(linea) ?? 0;
    const vendidas = vendidasDe.get(linea) ?? 0;
    const gananciaUnit = precioVenta - costoReal - pagoUnit;
    const margenPct = precioVenta > 0 ? (gananciaUnit / precioVenta) * 100 : 0;
    return {
      linea,
      label: lineaLabel[linea] ?? linea,
      icono: PERFIL_LINEA[linea]?.icono ?? "📦",
      color: PERFIL_LINEA[linea]?.color ?? "#0f766e",
      producidas,
      vendidas,
      pagoUnit,
      precioVenta,
      costoReal,
      pagoEstimado: producidas * pagoUnit,
      gananciaUnit,
      margenPct,
      gananciaVendidas: vendidas * gananciaUnit,
      ingresoVendidas: vendidas * precioVenta,
    };
  });
}
