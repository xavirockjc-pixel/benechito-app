"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

/**
 * INGRESO de insumo por un operario (bodeguero): suma al stock y deja el
 * movimiento con su nombre. El operario NO ve totales ni costos, solo registra.
 */
export async function ingresarMateriaOperario(formData: FormData) {
  const materiaPrimaId = String(formData.get("materiaPrimaId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim().replace(",", "."));
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  if (!materiaPrimaId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const u = await usuarioActual();
  await prisma.materiaPrima.update({ where: { id: materiaPrimaId }, data: { stock: { increment: cantidad } } });
  await prisma.movimientoMateria.create({
    data: {
      materiaPrimaId, tipo: "entrada", cantidad, motivo,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });

  revalidatePath("/bodega/insumos");
  revalidatePath("/admin/materias");
}

/**
 * CONSUMO manual de insumo por un operario (producción): descuenta del stock.
 * Para lo que no está en receta o para ajustar. El operario no ve totales.
 */
export async function consumirMateriaOperario(formData: FormData) {
  const materiaPrimaId = String(formData.get("materiaPrimaId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim().replace(",", "."));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Consumo en producción";
  if (!materiaPrimaId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const u = await usuarioActual();
  await prisma.materiaPrima.update({ where: { id: materiaPrimaId }, data: { stock: { decrement: cantidad } } });
  await prisma.movimientoMateria.create({
    data: {
      materiaPrimaId, tipo: "consumo", cantidad, motivo,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });

  revalidatePath("/produccion/insumos");
  revalidatePath("/admin/materias");
}
