"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Las áreas a centralizar (recursos que entran/salen, producción y ventas).
const AREAS_CENTRALIZAR: { area: string; titulo: string }[] = [
  { area: "produccion", titulo: "Centralizar Producción (lo que se hace, turnos y pago)" },
  { area: "inventario", titulo: "Centralizar Bodega (entradas, salidas por motivo y stock)" },
  { area: "ventas", titulo: "Centralizar Local/Caja (ventas, medios y caja vecina)" },
  { area: "reparto", titulo: "Centralizar Vendedor/Ruta (venta, cobros y camión)" },
  { area: "ventas", titulo: "Centralizar Distribución (pedidos y despachos)" },
];

/** Crea (una vez) el plan de centralización: una meta por área, con fecha a ~1½ semanas. */
export async function crearPlanCentralizacion() {
  const objetivo = new Date(); objetivo.setDate(objetivo.getDate() + 11); // ~semana y media
  for (const m of AREAS_CENTRALIZAR) {
    const existe = await prisma.mejora.findFirst({ where: { titulo: m.titulo } });
    if (existe) continue;
    await prisma.mejora.create({
      data: { titulo: m.titulo, area: m.area, prioridad: "alta", estado: "pendiente", fechaObjetivo: objetivo, recordar: true },
    });
  }
  revalidatePath("/admin/plan");
  revalidatePath("/admin/gestor");
}
