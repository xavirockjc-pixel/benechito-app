"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Activa/ajusta la regla de puntos (a nivel empresa). */
export async function setConfigPuntos(formData: FormData) {
  const activo = String(formData.get("puntosActivo") ?? "") === "on";
  const porMonto = Math.max(1, Number(String(formData.get("puntosPorMonto") ?? "").replace(/[^\d]/g, "")) || 1000);
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) return;
  await prisma.empresa.update({ where: { id: empresa.id }, data: { puntosActivo: activo, puntosPorMonto: porMonto } });
  revalidatePath("/admin/puntos");
}

/** Suma puntos por una compra (según la regla $ → punto). */
export async function sumarPuntosPorCompra(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").replace(/[^\d]/g, ""));
  if (!negocioId || !Number.isFinite(monto) || monto <= 0) return;
  const empresa = await prisma.empresa.findFirst();
  const porMonto = empresa?.puntosPorMonto ?? 1000;
  const puntos = Math.floor(monto / porMonto);
  if (puntos <= 0) return;
  await prisma.$transaction([
    prisma.movimientoPuntos.create({ data: { negocioId, puntos, tipo: "gana", motivo: `Compra ${"$" + monto.toLocaleString("es-CL")}` } }),
    prisma.negocio.update({ where: { id: negocioId }, data: { puntos: { increment: puntos } } }),
  ]);
  revalidatePath("/admin/puntos");
}

/** Canjea puntos (no permite dejar saldo negativo). */
export async function canjearPuntos(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const puntos = Number(String(formData.get("puntos") ?? "").replace(/[^\d]/g, ""));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Canje";
  if (!negocioId || !Number.isFinite(puntos) || puntos <= 0) return;
  const neg = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { puntos: true } });
  if (!neg || neg.puntos < puntos) return;
  await prisma.$transaction([
    prisma.movimientoPuntos.create({ data: { negocioId, puntos: -puntos, tipo: "canje", motivo } }),
    prisma.negocio.update({ where: { id: negocioId }, data: { puntos: { decrement: puntos } } }),
  ]);
  revalidatePath("/admin/puntos");
}

/** Ajuste manual (+/−) de puntos. */
export async function ajustarPuntos(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const signo = String(formData.get("signo") ?? "+") === "-" ? -1 : 1;
  const abs = Number(String(formData.get("puntos") ?? "").replace(/[^\d]/g, ""));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Ajuste";
  if (!negocioId || !Number.isFinite(abs) || abs <= 0) return;
  const puntos = signo * abs;
  const neg = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { puntos: true } });
  if (!neg) return;
  const nuevo = Math.max(0, neg.puntos + puntos);
  await prisma.$transaction([
    prisma.movimientoPuntos.create({ data: { negocioId, puntos, tipo: "ajuste", motivo } }),
    prisma.negocio.update({ where: { id: negocioId }, data: { puntos: nuevo } }),
  ]);
  revalidatePath("/admin/puntos");
}
