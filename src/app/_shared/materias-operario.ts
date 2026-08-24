"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

const UNIDADES_OK = ["kg", "g", "l", "ml", "unidad"];

/**
 * CREA un insumo desde bodega (el bodeguero). Sin costo (eso lo pone la central).
 * Si viene stock inicial, lo suma y deja la entrada en el registro.
 */
export async function crearMateriaOperario(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "insumo").trim() === "material" ? "material" : "insumo";
  const unidadRaw = String(formData.get("unidad") ?? "unidad").trim();
  const unidad = UNIDADES_OK.includes(unidadRaw) ? unidadRaw : "unidad";
  const stockInicial = Number(String(formData.get("stockInicial") ?? "").trim().replace(",", "."));
  if (!nombre) return;

  const u = await usuarioActual();
  const inicial = Number.isFinite(stockInicial) && stockInicial > 0 ? stockInicial : 0;
  const mat = await prisma.materiaPrima.create({
    data: { nombre, categoria, unidad, stock: inicial },
  });
  if (inicial > 0) {
    await prisma.movimientoMateria.create({
      data: { materiaPrimaId: mat.id, tipo: "entrada", cantidad: inicial, motivo: "Alta de insumo", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
    });
  }

  revalidatePath("/bodega/insumos");
  revalidatePath("/admin/materias");
}

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
 * SALIDA de insumo desde bodega por el bodeguero (entrega a producción, traslado,
 * etc.). Descuenta del stock y queda en el registro. El bodeguero ve cantidades,
 * no costos.
 */
export async function sacarMateriaOperario(formData: FormData) {
  const materiaPrimaId = String(formData.get("materiaPrimaId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim().replace(",", "."));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Salida de bodega";
  if (!materiaPrimaId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const u = await usuarioActual();
  await prisma.materiaPrima.update({ where: { id: materiaPrimaId }, data: { stock: { decrement: cantidad } } });
  await prisma.movimientoMateria.create({
    data: {
      materiaPrimaId, tipo: "salida", cantidad, motivo,
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
