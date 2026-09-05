"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MODALIDADES_PAGO } from "@/lib/dominio/sueldos";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d]/g, ""));

/** Define la modalidad de pago y la tarifa de un trabajador. */
export async function setModalidad(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const m = val(formData, "modalidad");
  const modalidadPago = (MODALIDADES_PAGO as readonly string[]).includes(m) ? m : "mensual";
  const rawT = val(formData, "tarifa");
  const tarifa = rawT ? numero(rawT) : null;
  await prisma.trabajador.update({ where: { id }, data: { modalidadPago, tarifa } });
  revalidatePath("/admin/sueldos");
}

/** Registra un "trato" (producción a trato): cantidad × valor = monto ganado. */
export async function registrarTrato(formData: FormData) {
  const trabajadorId = val(formData, "trabajadorId");
  const concepto = val(formData, "concepto") || "Trato";
  const cantidad = numero(val(formData, "cantidad"));
  const valorUnit = numero(val(formData, "valorUnit"));
  if (!trabajadorId || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(valorUnit) || valorUnit <= 0) return;
  const monto = cantidad * valorUnit;
  const fechaStr = val(formData, "fecha");
  const fecha = fechaStr ? new Date(fechaStr) : new Date();
  await prisma.movimientoTrabajador.create({
    data: {
      trabajadorId, tipo: "trato", monto,
      notas: `${concepto}: ${cantidad} × $${valorUnit.toLocaleString("es-CL")}`,
      fecha: isNaN(fecha.getTime()) ? new Date() : fecha,
    },
  });
  revalidatePath("/admin/sueldos");
  revalidatePath(`/admin/equipo/${trabajadorId}`);
}

/** Crea una tarifa de trato (producto + $ por unidad). */
export async function crearTarifaTrato(formData: FormData) {
  const nombre = val(formData, "nombre");
  const valorUnit = numero(val(formData, "valorUnit"));
  if (!nombre || !Number.isFinite(valorUnit) || valorUnit <= 0) return;
  await prisma.tarifaTrato.create({ data: { nombre, valorUnit } });
  revalidatePath("/admin/sueldos");
}

/** Edita una tarifa de trato (nombre y/o valor). */
export async function actualizarTarifaTrato(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const nombre = val(formData, "nombre");
  const valorUnit = numero(val(formData, "valorUnit"));
  if (!nombre || !Number.isFinite(valorUnit) || valorUnit <= 0) return;
  await prisma.tarifaTrato.update({ where: { id }, data: { nombre, valorUnit } });
  revalidatePath("/admin/sueldos");
}

/** Borra una tarifa de trato. */
export async function eliminarTarifaTrato(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.tarifaTrato.delete({ where: { id } });
  revalidatePath("/admin/sueldos");
}

/** Carga tarifas de ejemplo (solo si no hay ninguna). */
export async function cargarTarifasEjemplo() {
  const n = await prisma.tarifaTrato.count();
  if (n > 0) return;
  const ejemplos = [
    { nombre: "Tuyoyo", valorUnit: 25 },
    { nombre: "Paleta", valorUnit: 20 },
    { nombre: "Paleta de agua", valorUnit: 20 },
    { nombre: "Postre", valorUnit: 80 },
    { nombre: "Canasta", valorUnit: 100 },
    { nombre: "Balde 5 L", valorUnit: 350 },
  ];
  await prisma.tarifaTrato.createMany({ data: ejemplos });
  revalidatePath("/admin/sueldos");
}

/** Registra el pago del líquido del período como movimiento de la cuenta. */
export async function registrarPagoLiquido(formData: FormData) {
  const trabajadorId = val(formData, "trabajadorId");
  const monto = numero(val(formData, "monto"));
  const periodo = val(formData, "periodo");
  if (!trabajadorId || !Number.isFinite(monto) || monto <= 0) return;
  await prisma.movimientoTrabajador.create({
    data: { trabajadorId, tipo: "pago", monto, notas: `Pago ${periodo}` },
  });
  revalidatePath("/admin/sueldos");
  revalidatePath(`/admin/equipo/${trabajadorId}`);
}
