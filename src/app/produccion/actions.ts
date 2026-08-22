"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";

/** Cierra la sesión. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

async function bodegaId(): Promise<string | null> {
  const b = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  return b?.id ?? null;
}

type ItemProd = { saborId?: string; nombre: string; cantidad: number };

/**
 * Registra producción por TIPO (línea) + SABOR. Cada sabor producido entra al
 * stock de sabores de la bodega (StockSabor); si el sabor no existe, se crea.
 * Queda en el registro del día de Producción (zona "produccion").
 */
export async function registrarProduccion(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim() || "otro";
  let items: ItemProd[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.nombre?.trim() && Number.isFinite(i.cantidad) && i.cantidad > 0);
  if (items.length === 0) return;

  const bod = await bodegaId();
  if (!bod) return;
  const u = await usuarioActual();

  for (const it of items) {
    let saborId = it.saborId?.trim();
    if (!saborId) {
      const existe = await prisma.sabor.findFirst({ where: { nombre: it.nombre.trim(), linea } });
      saborId = existe?.id ?? (await prisma.sabor.create({ data: { nombre: it.nombre.trim(), linea } })).id;
    }
    await prisma.stockSabor.upsert({
      where: { saborId_ubicacionId: { saborId, ubicacionId: bod } },
      update: { cantidad: { increment: it.cantidad } },
      create: { saborId, ubicacionId: bod, cantidad: it.cantidad },
    });
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: "sabor",
        refId: saborId, nombre: `${it.nombre.trim()} (${linea})`, cantidad: it.cantidad,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}
