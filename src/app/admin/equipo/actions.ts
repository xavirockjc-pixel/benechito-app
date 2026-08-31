"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { CARGOS, TIPOS_MOV_TRABAJADOR, TIPOS_ASISTENCIA, tipoPresente, horasEntre } from "@/lib/dominio/equipo";

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

const hhmm = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, "0") : null;
};

/** Registra la asistencia del día: horario, tipo de jornada, horas y nota de lo que hizo. */
export async function registrarAsistencia(formData: FormData) {
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  if (!trabajadorId) return;

  const tipoRaw = String(formData.get("tipo") ?? "trabajo").trim();
  const tipo = (TIPOS_ASISTENCIA as readonly string[]).includes(tipoRaw) ? tipoRaw : "trabajo";
  const horaEntrada = hhmm(formData.get("horaEntrada"));
  const horaSalida = hhmm(formData.get("horaSalida"));
  const horasExtra = num(formData.get("horasExtra"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const fechaStr = String(formData.get("fecha") ?? "").trim();

  // Horas: si vino el número lo respeto; si no, lo calculo desde el horario.
  const horasManual = num(formData.get("horas"));
  const horasCalc = horasEntre(horaEntrada, horaSalida);
  const horas = tipoPresente(tipo) ? (horasManual > 0 ? horasManual : horasCalc) : 0;

  const fecha = fechaStr ? new Date(fechaStr) : new Date();
  await prisma.asistencia.create({
    data: {
      trabajadorId, tipo, horaEntrada, horaSalida, horas, horasExtra, notas,
      presente: tipoPresente(tipo),
      fecha: isNaN(fecha.getTime()) ? new Date() : fecha,
    },
  });
  revalidatePath(`/admin/equipo/${trabajadorId}`);
  revalidatePath("/admin/equipo");
}

/** Borra un registro de asistencia. */
export async function eliminarAsistencia(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  if (!id) return;
  await prisma.asistencia.delete({ where: { id } });
  if (trabajadorId) revalidatePath(`/admin/equipo/${trabajadorId}`);
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
