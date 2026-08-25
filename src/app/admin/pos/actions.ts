"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MEDIOS_PAGO, estadoPagoDe } from "@/lib/dominio/ventas";

type LineaPOS = { productoId: string; cantidad: number; precioUnit: number };

/** Cliente genérico de mostrador (walk-in). Se crea una vez y se reutiliza. */
async function clienteMostrador() {
  let c = await prisma.negocio.findFirst({ where: { nombreNegocio: "Consumidor Final" } });
  if (!c) {
    c = await prisma.negocio.create({
      data: {
        nombreContacto: "Consumidor Final",
        nombreNegocio: "Consumidor Final",
        whatsapp: "",
        comuna: "",
        tipoCliente: "consumidor",
        estado: "punto_activo",
        origen: "pos",
      },
    });
  }
  return c;
}

/**
 * Venta de mostrador (POS): crea la venta pagada, registra el pago y descuenta stock
 * de la sala de ventas. Recibe las líneas como JSON en el campo `items`.
 */
export async function venderPOS(formData: FormData) {
  const modo = String(formData.get("modo") ?? formData.get("medio") ?? "efectivo").trim(); // efectivo|transferencia|credito|abono
  const negocioIdSel = String(formData.get("negocioId") ?? "").trim();
  const raw = String(formData.get("items") ?? "[]");

  let items: LineaPOS[] = [];
  try {
    items = JSON.parse(raw);
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0 && i.precioUnit >= 0);
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);

  const ubicacion =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  if (!ubicacion) return;

  // Cliente: el elegido, o "Consumidor Final" (mostrador). Crédito/abono requieren
  // un cliente real; con mostrador se fuerza pago al contado.
  const cliente = negocioIdSel
    ? (await prisma.negocio.findUnique({ where: { id: negocioIdSel } })) ?? (await clienteMostrador())
    : await clienteMostrador();
  const clienteReal = Boolean(negocioIdSel) && cliente.nombreNegocio !== "Consumidor Final";

  // Abono: paga una parte ahora, el resto queda de deuda.
  let abono = Number(String(formData.get("abono") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(abono) || abono < 0) abono = 0;
  abono = Math.min(abono, total);
  const medioAbonoRaw = String(formData.get("medioAbono") ?? "efectivo");
  const medioAbono = (MEDIOS_PAGO as readonly string[]).includes(medioAbonoRaw) && medioAbonoRaw !== "credito" ? medioAbonoRaw : "efectivo";

  const esAbono = modo === "abono" && clienteReal;
  const aCredito = modo === "credito" && clienteReal;
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) ? modo : "efectivo";

  let estadoPago: string;
  let pagos: { create: { medio: string; monto: number } } | undefined;
  if (esAbono) {
    estadoPago = estadoPagoDe(total, abono);
    pagos = abono > 0 ? { create: { medio: medioAbono, monto: abono } } : undefined;
  } else if (aCredito) {
    estadoPago = "pendiente";
    pagos = undefined;
  } else {
    estadoPago = "pagado";
    pagos = { create: { medio, monto: total } };
  }

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId: ubicacion.id,
      total,
      estadoPago,
      documento: "boleta",
      canal: "directa",
      ...(pagos ? { pagos } : {}),
    },
  });

  // Descuenta stock de la sala y registra el movimiento por cada línea.
  for (const it of items) {
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: it.productoId, ubicacionId: ubicacion.id } },
      update: { cantidad: { decrement: it.cantidad } },
      create: { productoId: it.productoId, ubicacionId: ubicacion.id, cantidad: -it.cantidad },
    });
    await prisma.movimientoStock.create({
      data: {
        productoId: it.productoId,
        tipo: "venta",
        ubicacionOrigenId: ubicacion.id,
        cantidad: it.cantidad,
        referencia: venta.id,
      },
    });
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/inventario");
  redirect(`/admin/ventas/${venta.id}`);
}
