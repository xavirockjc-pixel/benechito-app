"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";
import { MEDIOS_PAGO } from "@/lib/dominio/ventas";

type LineaPOS = { productoId: string; cantidad: number; precioUnit: number };

/** Cierra la sesión del cajero. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

/** Ubicación de la sala (donde vive la caja). */
async function salaId(): Promise<string | null> {
  const s = (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  return s?.id ?? null;
}

/** Sesión de caja abierta de la sala (o null). */
export async function sesionAbierta() {
  const sala = await salaId();
  if (!sala) return null;
  return prisma.sesionCaja.findFirst({ where: { ubicacionId: sala, estado: "abierta" } });
}

/** Cliente genérico de mostrador (walk-in). */
async function clienteMostrador() {
  let c = await prisma.negocio.findFirst({ where: { nombreNegocio: "Consumidor Final" } });
  if (!c) {
    c = await prisma.negocio.create({
      data: { nombreContacto: "Consumidor Final", nombreNegocio: "Consumidor Final", whatsapp: "", comuna: "", tipoCliente: "consumidor", estado: "punto_activo", origen: "pos" },
    });
  }
  return c;
}

/** Abre la caja con un fondo inicial. */
export async function abrirCaja(formData: FormData) {
  const fondo = Number(String(formData.get("fondo") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(fondo) || fondo < 0) return;
  if (await sesionAbierta()) return; // ya hay una abierta

  const sala = await salaId();
  if (!sala) return;
  const u = await usuarioActual();

  await prisma.sesionCaja.create({
    data: { ubicacionId: sala, usuarioId: u?.sub ?? null, fondoInicial: fondo, estado: "abierta" },
  });
  revalidatePath("/caja");
}

/** Venta de mostrador: crea venta pagada, descuenta stock de la sala y la liga a la caja. */
export async function venderCaja(formData: FormData) {
  const medio = String(formData.get("medio") ?? "efectivo").trim();
  if (!(MEDIOS_PAGO as readonly string[]).includes(medio)) return;

  const sesion = await sesionAbierta();
  if (!sesion) return; // no se vende sin caja abierta

  let items: LineaPOS[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0 && i.precioUnit >= 0);
  if (items.length === 0) return;

  const subtotal = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);
  const descuento = Math.max(0, Math.min(Number(String(formData.get("descuento") ?? "0")) || 0, subtotal));
  const total = subtotal - descuento;
  const cliente = await clienteMostrador();

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId: sesion.ubicacionId,
      sesionCajaId: sesion.id,
      total,
      estadoPago: "pagado",
      documento: "boleta",
      pagos: { create: { medio, monto: total } },
    },
  });

  for (const it of items) {
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: it.productoId, ubicacionId: sesion.ubicacionId } },
      update: { cantidad: { decrement: it.cantidad } },
      create: { productoId: it.productoId, ubicacionId: sesion.ubicacionId, cantidad: -it.cantidad },
    });
    await prisma.movimientoStock.create({
      data: { productoId: it.productoId, tipo: "venta", ubicacionOrigenId: sesion.ubicacionId, cantidad: it.cantidad, referencia: venta.id },
    });
  }

  revalidatePath("/caja");
}

/** Registra un retiro/ingreso de efectivo de la caja (ej: pagar algo del cajón). */
export async function movimientoCaja(formData: FormData) {
  const sesion = await sesionAbierta();
  if (!sesion) return;
  const tipo = String(formData.get("tipo") ?? "").trim();
  const concepto = String(formData.get("concepto") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(",", "."));
  if (!["ingreso", "egreso"].includes(tipo) || !concepto || !Number.isFinite(monto) || monto <= 0) return;

  await prisma.movimientoCaja.create({ data: { sesionCajaId: sesion.id, tipo, concepto, monto } });
  revalidatePath("/caja");
}

/** Cierra la caja: guarda el efectivo contado (arqueo) y finaliza la sesión. */
export async function cerrarCaja(formData: FormData) {
  const sesion = await sesionAbierta();
  if (!sesion) return;
  const contado = Number(String(formData.get("efectivoContado") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(contado) || contado < 0) return;

  await prisma.sesionCaja.update({
    where: { id: sesion.id },
    data: {
      estado: "cerrada",
      efectivoContado: contado,
      fechaCierre: new Date(),
      notas: String(formData.get("notas") ?? "").trim() || null,
    },
  });
  revalidatePath("/caja");
  redirect("/caja");
}
