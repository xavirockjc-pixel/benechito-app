"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { CARGOS, TIPOS_MOV_TRABAJADOR } from "@/lib/dominio/equipo";

const num = (v: FormDataEntryValue | null) => Math.max(0, Number(String(v ?? "0").replace(",", ".")) || 0);

/** Crea un trabajador. */
export async function crearTrabajador(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const cargoRaw = String(formData.get("cargo") ?? "operario").trim();
  const cargo = (CARGOS as readonly string[]).includes(cargoRaw) ? cargoRaw : "operario";
  const valorHora = num(formData.get("valorHora"));
  const usuarioId = String(formData.get("usuarioId") ?? "").trim() || null;
  if (!nombre) return;
  await prisma.trabajador.create({
    data: { nombre, cargo, usuarioId, valorHora: valorHora > 0 ? valorHora : null },
  });
  revalidatePath("/admin/equipo");
}

/** Registra la asistencia del día (horas + horas extra). */
export async function registrarAsistencia(formData: FormData) {
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  const horas = num(formData.get("horas"));
  const horasExtra = num(formData.get("horasExtra"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const fechaStr = String(formData.get("fecha") ?? "").trim();
  if (!trabajadorId) return;
  const fecha = fechaStr ? new Date(fechaStr) : new Date();
  await prisma.asistencia.create({
    data: { trabajadorId, horas, horasExtra, notas, presente: horas > 0 || horasExtra > 0, fecha: isNaN(fecha.getTime()) ? new Date() : fecha },
  });
  // Registra las horas extra también en su cuenta si se indicó valor.
  revalidatePath(`/admin/equipo/${trabajadorId}`);
  revalidatePath("/admin/equipo");
}

/** Registra un movimiento de cuenta: pago, adelanto, deuda, hora extra, bono, descuento. */
export async function movimientoTrabajador(formData: FormData) {
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  const tipoRaw = String(formData.get("tipo") ?? "").trim();
  const tipo = (TIPOS_MOV_TRABAJADOR as readonly string[]).includes(tipoRaw) ? tipoRaw : null;
  const monto = num(formData.get("monto"));
  const horas = num(formData.get("horas"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!trabajadorId || !tipo) return;
  if (monto <= 0 && horas <= 0) return;
  const u = await usuarioActual();
  await prisma.movimientoTrabajador.create({
    data: { trabajadorId, tipo, monto, horas, notas, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  });
  revalidatePath(`/admin/equipo/${trabajadorId}`);
  revalidatePath("/admin/equipo");
}

/** Borra un movimiento de cuenta. */
export async function eliminarMovTrabajador(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  if (!id) return;
  await prisma.movimientoTrabajador.delete({ where: { id } });
  if (trabajadorId) revalidatePath(`/admin/equipo/${trabajadorId}`);
}

/** Enlaza (o desenlaza) el trabajador con su usuario de login. */
export async function enlazarTrabajadorUsuario(formData: FormData) {
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  const usuarioId = String(formData.get("usuarioId") ?? "").trim() || null;
  if (!trabajadorId) return;
  await prisma.trabajador.update({ where: { id: trabajadorId }, data: { usuarioId } });
  revalidatePath(`/admin/equipo/${trabajadorId}`);
  revalidatePath("/admin/equipo");
}

/** Activa/desactiva un trabajador. */
export async function toggleTrabajador(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const t = await prisma.trabajador.findUnique({ where: { id } });
  if (!t) return;
  await prisma.trabajador.update({ where: { id }, data: { activo: !t.activo } });
  revalidatePath("/admin/equipo");
  redirect("/admin/equipo");
}
