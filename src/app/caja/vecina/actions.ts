"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { TIPOS_CV } from "@/lib/dominio/caja-vecina";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d]/g, ""));

/** Registra un movimiento de Caja Vecina (separado de las ventas). */
export async function registrarMovCajaVecina(formData: FormData) {
  const tipoRaw = val(formData, "tipo");
  const tipo = (TIPOS_CV as readonly string[]).includes(tipoRaw) ? tipoRaw : "ajuste";
  const monto = numero(val(formData, "monto"));
  if (!Number.isFinite(monto) || monto <= 0) return;
  const foto = val(formData, "foto");
  const u = await usuarioActual();
  await prisma.movimientoCajaVecina.create({
    data: {
      tipo, monto,
      detalle: val(formData, "detalle") || null,
      foto: foto.startsWith("data:image") ? foto : null,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
}

/** Abre la Caja Vecina del día: efectivo disponible + saldo/cupo de la máquina. */
export async function abrirCajaVecina(formData: FormData) {
  const efectivo = numero(val(formData, "efectivo"));
  const saldoMaquina = numero(val(formData, "saldoMaquina"));
  if ((!Number.isFinite(efectivo) || efectivo < 0) && (!Number.isFinite(saldoMaquina) || saldoMaquina < 0)) return;
  const desglose = val(formData, "efectivo_desglose");
  const u = await usuarioActual();
  await prisma.movimientoCajaVecina.create({
    data: {
      tipo: "apertura",
      monto: efectivo || 0,
      saldoMaquina: Number.isFinite(saldoMaquina) ? saldoMaquina : null,
      detalle: desglose ? `Billetes/monedas: ${desglose}` : null,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
}

/** Cierra la Caja Vecina del día: cuadra efectivo (contado vs esperado) y máquina (final vs apertura). */
export async function cerrarCajaVecina(formData: FormData) {
  const efectivoContado = numero(val(formData, "efectivoContado"));
  const saldoMaquinaFinal = numero(val(formData, "saldoMaquinaFinal"));
  const notas = val(formData, "notas");
  const u = await usuarioActual();

  const detalle =
    `Efectivo contado: ${efectivoContado} · Saldo máquina final: ${saldoMaquinaFinal}` +
    (notas ? ` · ${notas}` : "");

  await prisma.movimientoCajaVecina.create({
    data: {
      tipo: "cierre",
      monto: 0, // el cierre no mueve el efectivo, solo deja registro
      saldoMaquina: Number.isFinite(saldoMaquinaFinal) ? saldoMaquinaFinal : null,
      detalle,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
  redirect("/caja/vecina");
}

/** Borra un movimiento de Caja Vecina. */
export async function eliminarMovCajaVecina(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.movimientoCajaVecina.delete({ where: { id } });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
}
