"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion } from "@/lib/auth";

/** Cierra la sesión. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

/** La bodega principal (primera ubicación tipo bodega). */
async function bodegaId(): Promise<string | null> {
  const b = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  return b?.id ?? null;
}

type ItemMov = { id: string; delta: number }; // id = "prod:<id>" | "sab:<id>"

/**
 * Aplica movimientos de stock en bodega. delta>0 = entra (producción/recepción),
 * delta<0 = sale (merma/ajuste). Sirve para productos (Stock) y sabores (StockSabor).
 * Nunca deja el stock por debajo de 0.
 */
export async function moverStockBodega(formData: FormData) {
  let items: ItemMov[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => typeof i.id === "string" && Number.isFinite(i.delta) && i.delta !== 0);
  if (items.length === 0) return;

  const bod = await bodegaId();
  if (!bod) return;

  for (const it of items) {
    const [kind, realId] = it.id.split(":");
    if (!realId) continue;

    if (kind === "prod") {
      const actual = await prisma.stock.findUnique({ where: { productoId_ubicacionId: { productoId: realId, ubicacionId: bod } } });
      const disponible = actual?.cantidad ?? 0;
      const nueva = Math.max(0, disponible + it.delta);
      const aplicado = nueva - disponible; // lo realmente movido (respeta el piso en 0)
      if (aplicado === 0) continue;
      await prisma.stock.upsert({
        where: { productoId_ubicacionId: { productoId: realId, ubicacionId: bod } },
        update: { cantidad: nueva },
        create: { productoId: realId, ubicacionId: bod, cantidad: nueva },
      });
      await prisma.movimientoStock.create({
        data: {
          productoId: realId,
          tipo: aplicado > 0 ? "produccion" : "merma",
          ubicacionDestinoId: aplicado > 0 ? bod : null,
          ubicacionOrigenId: aplicado < 0 ? bod : null,
          cantidad: Math.abs(aplicado),
          referencia: "bodega-app",
        },
      });
    } else if (kind === "sab") {
      const actual = await prisma.stockSabor.findUnique({ where: { saborId_ubicacionId: { saborId: realId, ubicacionId: bod } } });
      const disponible = actual?.cantidad ?? 0;
      const nueva = Math.max(0, disponible + it.delta);
      await prisma.stockSabor.upsert({
        where: { saborId_ubicacionId: { saborId: realId, ubicacionId: bod } },
        update: { cantidad: nueva },
        create: { saborId: realId, ubicacionId: bod, cantidad: nueva },
      });
    }
  }

  revalidatePath("/bodega");
  redirect("/bodega?ok=1");
}
