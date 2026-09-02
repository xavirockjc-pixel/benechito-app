"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// --- Stock: aplicar una variación a una ubicación (upsert) ---
async function aplicarDelta(productoId: string, ubicacionId: string, delta: number) {
  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    update: { cantidad: { increment: delta } },
    create: { productoId, ubicacionId, cantidad: delta },
  });
}

/**
 * Registra un movimiento de inventario. Según el tipo actualiza el stock y deja el
 * registro auditable en MovimientoStock.
 *   - ingreso: entra a la ubicación destino.
 *   - transferencia: sale de origen y entra a destino (cargar vehículo).
 *   - merma: sale de origen.
 *   - ajuste: fija la cantidad exacta en destino (delta = nuevo - actual).
 */
export async function registrarMovimiento(formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const productoId = String(formData.get("productoId") ?? "").trim();
  const origenId = String(formData.get("ubicacionOrigenId") ?? "").trim() || null;
  const destinoId = String(formData.get("ubicacionDestinoId") ?? "").trim() || null;
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());

  if (!productoId || !Number.isFinite(cantidad)) return;

  if (tipo === "ingreso") {
    if (!destinoId || cantidad <= 0) return;
    await aplicarDelta(productoId, destinoId, cantidad);
    await prisma.movimientoStock.create({
      data: { productoId, tipo, ubicacionDestinoId: destinoId, cantidad },
    });
  } else if (tipo === "transferencia") {
    if (!origenId || !destinoId || origenId === destinoId || cantidad <= 0) return;
    await aplicarDelta(productoId, origenId, -cantidad);
    await aplicarDelta(productoId, destinoId, cantidad);
    await prisma.movimientoStock.create({
      data: { productoId, tipo, ubicacionOrigenId: origenId, ubicacionDestinoId: destinoId, cantidad },
    });
  } else if (tipo === "merma") {
    if (!origenId || cantidad <= 0) return;
    await aplicarDelta(productoId, origenId, -cantidad);
    await prisma.movimientoStock.create({
      data: { productoId, tipo, ubicacionOrigenId: origenId, cantidad },
    });
  } else if (tipo === "ajuste") {
    if (!destinoId || cantidad < 0) return;
    const actual = await prisma.stock.findUnique({
      where: { productoId_ubicacionId: { productoId, ubicacionId: destinoId } },
    });
    const delta = cantidad - (actual?.cantidad ?? 0);
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId, ubicacionId: destinoId } },
      update: { cantidad: cantidad },
      create: { productoId, ubicacionId: destinoId, cantidad },
    });
    await prisma.movimientoStock.create({
      data: { productoId, tipo, ubicacionDestinoId: destinoId, cantidad: delta },
    });
  } else {
    return;
  }

  revalidatePath("/admin/inventario");
}

/**
 * Fija la cantidad EXACTA de un producto en una ubicación (edición directa de la tabla).
 * Registra la diferencia como "ajuste" auditable. Es el modo manual, sin protocolos.
 */
export async function fijarStock(productoId: string, ubicacionId: string, cantidad: number) {
  if (!productoId || !ubicacionId || !Number.isFinite(cantidad) || cantidad < 0) return;
  const actual = await prisma.stock.findUnique({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
  });
  const delta = cantidad - (actual?.cantidad ?? 0);
  if (delta === 0) return;
  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    update: { cantidad },
    create: { productoId, ubicacionId, cantidad },
  });
  await prisma.movimientoStock.create({
    data: { productoId, tipo: "ajuste", ubicacionDestinoId: ubicacionId, cantidad: delta },
  });
  revalidatePath("/admin/inventario");
}

// --- Ubicaciones (CRUD) ---

/** Crea una ubicación en la sucursal (la primera disponible). */
export async function crearUbicacion(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  if (!nombre || !tipo) return;

  const sucursal = await prisma.sucursal.findFirst();
  if (!sucursal) return;

  await prisma.ubicacion.create({ data: { nombre, tipo, sucursalId: sucursal.id } });
  revalidatePath("/admin/inventario/ubicaciones");
  revalidatePath("/admin/inventario");
}

/** Edita nombre / tipo / estado de una ubicación. */
export async function actualizarUbicacion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  if (!id || !nombre || !tipo) return;

  await prisma.ubicacion.update({
    where: { id },
    data: { nombre, tipo, activo: formData.get("activo") === "si" },
  });
  revalidatePath("/admin/inventario/ubicaciones");
  revalidatePath("/admin/inventario");
}

/** Elimina una ubicación (su stock en cascada). No borra si tiene movimientos/ventas. */
export async function eliminarUbicacion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    await prisma.ubicacion.delete({ where: { id } });
  } catch {
    // referenciada por movimientos/ventas → se desactiva.
    await prisma.ubicacion.update({ where: { id }, data: { activo: false } });
  }
  revalidatePath("/admin/inventario/ubicaciones");
  revalidatePath("/admin/inventario");
  redirect("/admin/inventario/ubicaciones");
}
