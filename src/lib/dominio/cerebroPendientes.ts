import { prisma } from "@/lib/prisma";

export type PendienteCerebro = {
  clave: string;       // id estable para "omitir por hoy"
  icono: string;
  titulo: string;
  detalle: string;
  href: string;        // a dónde ir para arreglarlo
  cta: string;         // texto del botón
  tono: "alerta" | "aviso" | "info";
};

/**
 * El "cerebro" revisa el negocio y arma la lista de lo que FALTÓ actualizar o
 * revisar: cosas que el equipo anotó y no se confirmaron (llegó leche…),
 * recordatorios de hoy, caja sin cerrar, stock en negativo o bajo. Cada punto
 * lleva a la pantalla para arreglarlo; en la app se puede "omitir por hoy".
 * Solo lectura: no cambia datos, solo detecta.
 */
export async function pendientesCerebro(): Promise<PendienteCerebro[]> {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 24 * 3600 * 1000);

  const [sugeridas, recordatorios, cajasAbiertas, negativos, prodMin] = await Promise.all([
    // 1) El equipo anotó algo que mueve stock y no se confirmó ("llegó leche", "salió…").
    prisma.nota.count({ where: { accionEstado: "sugerida" } }),
    // 2) Recordatorios/tareas con fecha para hoy o ya vencidas, sin cerrar.
    prisma.nota.count({ where: { estado: { not: "hecha" }, tipo: { in: ["recordatorio", "tarea"] }, fechaObjetivo: { not: null, lt: finHoy } } }),
    // 3) Cajas que quedaron abiertas de días anteriores (faltó cerrar).
    prisma.sesionCaja.count({ where: { estado: "abierta", fechaApertura: { lt: inicioHoy } } }),
    // 4) Stock en negativo = se vendió/gastó algo que nunca se ingresó.
    prisma.stock.count({ where: { cantidad: { lt: 0 } } }),
    // 5) Productos bajo su mínimo (para reponer).
    prisma.producto.findMany({ where: { activo: true, stockMinimo: { gt: 0 } }, select: { id: true, stockMinimo: true } }),
  ]);

  // Stock bajo mínimo: suma el stock por producto y compara con su mínimo.
  let bajoMinimo = 0;
  if (prodMin.length > 0) {
    const sumas = await prisma.stock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { productoId: { in: prodMin.map((p) => p.id) } } });
    const sumaDe = new Map(sumas.map((s) => [s.productoId, Number(s._sum.cantidad ?? 0)]));
    bajoMinimo = prodMin.filter((p) => (sumaDe.get(p.id) ?? 0) <= p.stockMinimo).length;
  }

  const items: PendienteCerebro[] = [];

  if (sugeridas > 0) items.push({
    clave: "sugeridas", icono: "⚡", tono: "aviso",
    titulo: `${sugeridas} cosa${sugeridas > 1 ? "s" : ""} anotada${sugeridas > 1 ? "s" : ""} sin confirmar`,
    detalle: "El equipo anotó que llegó o salió algo (ej. “llegó leche”). Confírmalo para que el stock quede actualizado.",
    href: "/admin/notas", cta: "Revisar y confirmar",
  });

  if (recordatorios > 0) items.push({
    clave: "recordatorios", icono: "🔔", tono: "aviso",
    titulo: `${recordatorios} recordatorio${recordatorios > 1 ? "s" : ""} para hoy o vencido${recordatorios > 1 ? "s" : ""}`,
    detalle: "Cosas que pediste recordar (“recuérdame…”) y ya toca hacer o revisar.",
    href: "/admin/notas", cta: "Ver recordatorios",
  });

  if (cajasAbiertas > 0) items.push({
    clave: "caja", icono: "🧾", tono: "alerta",
    titulo: `${cajasAbiertas} caja${cajasAbiertas > 1 ? "s" : ""} sin cerrar de días anteriores`,
    detalle: "Quedó una caja abierta de un día pasado. Ciérrala para que el efectivo y las ventas cuadren.",
    href: "/admin/caja", cta: "Ver cajas",
  });

  if (negativos > 0) items.push({
    clave: "negativos", icono: "➖", tono: "alerta",
    titulo: `${negativos} producto${negativos > 1 ? "s" : ""} con stock en negativo`,
    detalle: "Se vendió o gastó algo que nunca se ingresó. Corrige el stock real (conteo) para dejarlo cuadrado.",
    href: "/admin/inventario", cta: "Corregir stock",
  });

  if (bajoMinimo > 0) items.push({
    clave: "bajominimo", icono: "⚠️", tono: "info",
    titulo: `${bajoMinimo} producto${bajoMinimo > 1 ? "s" : ""} bajo el mínimo`,
    detalle: "Están por acabarse. Conviene reponer o fabricar antes de quedar sin stock.",
    href: "/admin/inventario", cta: "Ver inventario",
  });

  return items;
}

/** Cuántos pendientes tiene el cerebro (para el aviso del panel). */
export async function contarPendientesCerebro(): Promise<number> {
  return (await pendientesCerebro()).length;
}
