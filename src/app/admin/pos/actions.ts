"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MEDIOS_PAGO } from "@/lib/dominio/ventas";

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
  const medio = String(formData.get("medio") ?? "efectivo").trim();
  const raw = String(formData.get("items") ?? "[]");
  if (!(MEDIOS_PAGO as readonly string[]).includes(medio)) return;

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

  const cliente = await clienteMostrador();

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId: ubicacion.id,
      total,
      estadoPago: "pagado",
      documento: "boleta",
      pagos: { create: { medio, monto: total } },
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
