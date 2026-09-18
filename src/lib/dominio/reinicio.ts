import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Reinicio de "los números" para empezar de cero, por secciones. NUNCA borra la
 * configuración (catálogo, precios, clientes, usuarios, equipo, recetas, insumos
 * definidos, plantillas): solo las transacciones/movimientos y deja los stocks en 0.
 */
export const AREAS_REINICIO = [
  { id: "ventas", label: "Ventas", icono: "💵", desc: "Ventas, pagos y documentos (boletas/facturas)." },
  { id: "produccion", label: "Producción", icono: "🏭", desc: "Reportes de turno, órdenes, despachos y agenda de fabricación." },
  { id: "bodega", label: "Bodega / stock", icono: "📦", desc: "Movimientos y deja el stock de productos y sabores en 0." },
  { id: "insumos", label: "Insumos (materias primas)", icono: "🧪", desc: "Consumos y deja el stock de insumos en 0." },
  { id: "vendedor", label: "Vendedor / reparto", icono: "🚚", desc: "Rutas, pedidos, preventa, gastos y revisiones de vehículo." },
  { id: "local", label: "Local / caja", icono: "🛒", desc: "Cierres y movimientos de caja (incluida Caja Vecina)." },
  { id: "equipo", label: "Equipo (asistencia y pagos)", icono: "👥", desc: "Asistencia y movimientos de pago del equipo." },
  { id: "finanzas", label: "Finanzas (gastos/deudas)", icono: "💰", desc: "Gastos, deudas y cálculos guardados." },
] as const;

export type AreaReinicio = (typeof AREAS_REINICIO)[number]["id"];
export const esAreaReinicio = (v: string): v is AreaReinicio => AREAS_REINICIO.some((a) => a.id === v);

/** Cuántos registros hay hoy en cada área (para mostrar qué se va a limpiar). */
export async function contarAreas(): Promise<Record<AreaReinicio, number>> {
  const [ventas, produccion, bodega, insumos, vendedor, local, equipo, finanzas] = await Promise.all([
    prisma.venta.count(),
    prisma.controlCalidad.count(),
    prisma.movimientoBodega.count(),
    prisma.movimientoMateria.count(),
    prisma.ruta.count().then(async (r) => r + (await prisma.pedido.count()) + (await prisma.preventa.count())),
    prisma.sesionCaja.count().then(async (s) => s + (await prisma.movimientoCajaVecina.count())),
    prisma.asistencia.count().then(async (a) => a + (await prisma.movimientoTrabajador.count())),
    prisma.gasto.count().then(async (g) => g + (await prisma.deuda.count())),
  ]);
  return { ventas, produccion, bodega, insumos, vendedor, local, equipo, finanzas };
}

/**
 * Ejecuta el reinicio de las áreas seleccionadas en una sola transacción
 * (todo o nada). El orden respeta las llaves foráneas (borra lo que apunta antes
 * que lo apuntado). Deja los stocks en 0 en vez de borrar las filas de stock.
 */
export async function reiniciarAreas(areas: Set<string>): Promise<void> {
  const has = (a: string) => areas.has(a);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1) VENTAS — documentos apuntan a la venta (restrict), van primero.
    if (has("ventas")) {
      await tx.documentoVenta.deleteMany({});
      await tx.pago.deleteMany({});
      await tx.venta.deleteMany({});
      await tx.movimientoPuntos.deleteMany({});
    }
    // 2) PRODUCCIÓN — despachos caen por cascada con el control; agenda de fabricación.
    if (has("produccion")) {
      await tx.despachoLote.deleteMany({});
      await tx.controlCalidad.deleteMany({});
      await tx.ordenProduccion.deleteMany({});
      await tx.agregadoUso.deleteMany({});
      await tx.agenda.deleteMany({ where: { tipo: { in: ["fabricar", "mezclar"] } } });
    }
    // 3) VENDEDOR / REPARTO — paradas caen con la ruta; ítems con el pedido.
    if (has("vendedor")) {
      await tx.ruta.deleteMany({});
      await tx.preventa.deleteMany({});
      await tx.pedido.deleteMany({});
      await tx.gastoVehiculo.deleteMany({});
      await tx.revisionVehiculo.deleteMany({});
      await tx.entregaImplemento.deleteMany({});
      await tx.flete.deleteMany({});
      await tx.agenda.deleteMany({ where: { tipo: { notIn: ["fabricar", "mezclar"] } } });
    }
    // 4) BODEGA / STOCK — movimientos y stock a 0.
    if (has("bodega")) {
      await tx.movimientoBodega.deleteMany({});
      await tx.movimientoStock.deleteMany({});
      await tx.reposicion.deleteMany({});
      await tx.stock.updateMany({ data: { cantidad: 0 } });
      await tx.stockSabor.updateMany({ data: { cantidad: 0 } });
    }
    // 5) INSUMOS — consumos y stock de materias primas a 0.
    if (has("insumos")) {
      await tx.movimientoMateria.deleteMany({});
      await tx.materiaPrima.updateMany({ data: { stock: 0 } });
    }
    // 6) LOCAL / CAJA — movimientos de caja caen con la sesión.
    if (has("local")) {
      await tx.sesionCaja.deleteMany({});
      await tx.movimientoCajaVecina.deleteMany({});
    }
    // 7) EQUIPO — asistencia y movimientos de pago.
    if (has("equipo")) {
      await tx.asistencia.deleteMany({});
      await tx.movimientoTrabajador.deleteMany({});
    }
    // 8) FINANZAS — gastos, deudas, cálculos.
    if (has("finanzas")) {
      await tx.gasto.deleteMany({});
      await tx.deuda.deleteMany({});
      await tx.calculo.deleteMany({});
    }
    // Al reiniciar cualquier cosa, se cierra el "período" (el día vuelve a partir de medianoche).
    await tx.empresa.updateMany({ data: { periodoDesde: null } });
  }, { timeout: 30000 });
}
