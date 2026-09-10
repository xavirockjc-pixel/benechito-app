"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estadoPagoDe } from "@/lib/dominio/ventas";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Ejecuta un comando de voz YA interpretado y confirmado por el usuario. */
export async function ejecutarComando(formData: FormData) {
  const intent = val(formData, "intent");
  const clase = val(formData, "clase"); // producto | sabor
  const refId = val(formData, "refId");
  const cantidad = Number(val(formData, "cantidad"));
  const monto = Number(val(formData, "monto"));
  const okRedirect = (msg: string) => redirect("/admin/voz?ok=" + encodeURIComponent(msg));

  // ---- Finanzas por voz ----
  if (intent === "gasto") {
    if (!Number.isFinite(monto) || monto <= 0) return;
    await prisma.gasto.create({ data: { concepto: val(formData, "concepto") || "Gasto", monto, categoria: "otros" } });
    revalidatePath("/admin/finanzas"); revalidatePath("/admin/panorama");
    okRedirect("Gasto registrado");
  }
  if (intent === "deuda") {
    if (!Number.isFinite(monto) || monto <= 0) return;
    await prisma.deuda.create({ data: { acreedor: val(formData, "acreedor") || "—", monto } });
    revalidatePath("/admin/estado-financiero");
    okRedirect("Deuda registrada");
  }
  if (intent === "pago") {
    const trabajadorId = val(formData, "trabajadorId");
    if (!trabajadorId || !Number.isFinite(monto) || monto <= 0) return;
    await prisma.movimientoTrabajador.create({ data: { trabajadorId, tipo: "pago", monto, notas: "Por voz" } });
    revalidatePath("/admin/sueldos"); revalidatePath("/admin/panorama");
    okRedirect("Pago registrado");
  }
  if (intent === "abono") {
    const negocioId = val(formData, "negocioId");
    if (!negocioId || !Number.isFinite(monto) || monto <= 0) return;
    let resto = monto;
    const ventas = await prisma.venta.findMany({ where: { negocioId }, include: { pagos: { select: { monto: true } } }, orderBy: { fecha: "asc" } });
    for (const v of ventas) {
      if (resto <= 0) break;
      const pagado = v.pagos.reduce((s, p) => s + Number(p.monto), 0);
      const saldo = Number(v.total) - pagado;
      if (saldo <= 0) continue;
      const aplicar = Math.min(saldo, resto);
      await prisma.pago.create({ data: { ventaId: v.id, medio: "efectivo", monto: aplicar } });
      await prisma.venta.update({ where: { id: v.id }, data: { estadoPago: estadoPagoDe(Number(v.total), pagado + aplicar) } });
      resto -= aplicar;
    }
    revalidatePath("/admin/cobranza"); revalidatePath("/admin/ventas");
    okRedirect("Abono registrado");
  }

  if (intent === "orden") {
    if (!refId || !Number.isFinite(cantidad) || cantidad <= 0) return;
    await prisma.ordenProduccion.create({
      data: {
        productoId: clase === "producto" ? refId : null,
        saborId: clase === "sabor" ? refId : null,
        cantidadPlan: cantidad,
        notas: "Creada por comando de voz",
        estado: "planificada",
      },
    });
    revalidatePath("/admin/produccion");
    redirect("/admin/voz?ok=" + encodeURIComponent("Orden de producción creada"));
  }

  if (intent === "agenda") {
    const titulo = val(formData, "titulo") || "Agendado por voz";
    const tipo = val(formData, "tipo") || "otro";
    const fecha = val(formData, "fecha");
    if (!fecha) return;
    await prisma.agenda.create({
      data: {
        titulo,
        fecha: new Date(fecha + "T12:00:00"),
        tipo,
        productoId: clase === "producto" ? refId || null : null,
        saborId: clase === "sabor" ? refId || null : null,
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
        notas: "Agendado por comando de voz",
      },
    });
    revalidatePath("/admin/agenda");
    redirect("/admin/voz?ok=" + encodeURIComponent("Agregado a la agenda"));
  }
}
