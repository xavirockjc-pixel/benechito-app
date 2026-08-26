"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { empresaActual } from "@/lib/dominio/empresa";
import { CATEGORIAS, UNIDADES } from "@/lib/dominio/materias";

/** Guarda (o quita) la clave de un tipo. Sin clave = tipo abierto. */
export async function guardarClaveTipo(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim();
  const clave = String(formData.get("clave") ?? "").trim();
  if (!linea) return;
  if (!clave) {
    await prisma.claveReceta.deleteMany({ where: { linea } });
  } else {
    await prisma.claveReceta.upsert({ where: { linea }, update: { clave }, create: { linea, clave } });
  }
  revalidatePath("/admin/materias/recetas");
  revalidatePath("/produccion");
  redirect("/admin/materias/recetas?seg=1");
}

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim().replace(",", "."));

/** Crea un insumo (materia prima o material). */
export async function crearMateria(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "insumo").trim();
  const unidad = String(formData.get("unidad") ?? "unidad").trim();
  const stockMinimo = num(formData.get("stockMinimo"));
  const costo = num(formData.get("costo"));
  const stockInicial = num(formData.get("stockInicial"));
  if (!nombre) return;

  const mat = await prisma.materiaPrima.create({
    data: {
      nombre,
      categoria: (CATEGORIAS as readonly string[]).includes(categoria) ? categoria : "insumo",
      unidad: (UNIDADES as readonly string[]).includes(unidad) ? unidad : "unidad",
      stockMinimo: Number.isFinite(stockMinimo) && stockMinimo > 0 ? stockMinimo : 0,
      costo: Number.isFinite(costo) && costo > 0 ? costo : null,
      stock: Number.isFinite(stockInicial) && stockInicial > 0 ? stockInicial : 0,
    },
  });
  if (Number.isFinite(stockInicial) && stockInicial > 0) {
    await prisma.movimientoMateria.create({
      data: { materiaPrimaId: mat.id, tipo: "entrada", cantidad: stockInicial, motivo: "Stock inicial" },
    });
  }

  revalidatePath("/admin/materias");
}

/** Movimiento manual desde la central: entrada, merma o ajuste (a un valor exacto). */
export async function moverMateria(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim(); // entrada | merma | ajuste
  const cantidad = num(formData.get("cantidad"));
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const lote = String(formData.get("lote") ?? "").trim() || null; // lote del proveedor (entradas)
  const venceStr = String(formData.get("vence") ?? "").trim();
  const vence = venceStr ? new Date(venceStr) : null;
  if (!id || !["entrada", "merma", "ajuste"].includes(tipo)) return;
  if (!Number.isFinite(cantidad)) return;

  const mat = await prisma.materiaPrima.findUnique({ where: { id }, select: { stock: true } });
  if (!mat) return;
  const u = await usuarioActual();

  if (tipo === "ajuste") {
    // Ajuste = fijar el stock al valor contado; registra la diferencia.
    const dif = cantidad - mat.stock;
    await prisma.materiaPrima.update({ where: { id }, data: { stock: cantidad } });
    await prisma.movimientoMateria.create({
      data: { materiaPrimaId: id, tipo: "ajuste", cantidad: dif, motivo: motivo ?? "Ajuste de inventario", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
    });
  } else {
    if (cantidad <= 0) return;
    const signo = tipo === "entrada" ? 1 : -1;
    await prisma.materiaPrima.update({ where: { id }, data: { stock: { increment: signo * cantidad } } });
    await prisma.movimientoMateria.create({
      data: {
        materiaPrimaId: id, tipo, cantidad, motivo,
        lote: tipo === "entrada" ? lote : null,
        vence: tipo === "entrada" && vence && !isNaN(vence.getTime()) ? vence : null,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  revalidatePath("/admin/materias");
}

/** Actualiza costo y stock mínimo de un insumo. */
export async function editarMateria(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const costo = num(formData.get("costo"));
  const stockMinimo = num(formData.get("stockMinimo"));
  if (!id) return;
  await prisma.materiaPrima.update({
    where: { id },
    data: {
      costo: Number.isFinite(costo) && costo > 0 ? costo : null,
      stockMinimo: Number.isFinite(stockMinimo) && stockMinimo >= 0 ? stockMinimo : 0,
    },
  });
  revalidatePath("/admin/materias");
}

/** Desactiva un insumo (no se borra para conservar el historial). */
export async function desactivarMateria(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.materiaPrima.update({ where: { id }, data: { activo: false } });
  revalidatePath("/admin/materias");
}

// ===========================================================================
//  Recetas (lista de materiales por producto/sabor)
// ===========================================================================

/** Busca un insumo por nombre; si no existe, lo crea. Devuelve su id. */
async function insumoIdOCrear(nombre: string, unidad: string): Promise<string> {
  const ex = await prisma.materiaPrima.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (ex) return ex.id;
  const u = (UNIDADES as readonly string[]).includes(unidad) ? unidad : "unidad";
  const nuevo = await prisma.materiaPrima.create({ data: { nombre, unidad: u } });
  return nuevo.id;
}

/** Agrega un insumo a la receta base (por tipo/línea) o de un producto/sabor.
 *  Si se escribe un insumo nuevo, se crea solo en la base. */
export async function agregarRecetaItem(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "").trim() || null;
  const saborId = String(formData.get("saborId") ?? "").trim() || null;
  const linea = String(formData.get("linea") ?? "").trim() || null;
  const nuevoInsumo = String(formData.get("nuevoInsumo") ?? "").trim();
  const nuevaUnidad = String(formData.get("nuevaUnidad") ?? "unidad").trim();
  const grupo = String(formData.get("grupo") ?? "").trim() || null;
  const cantidad = num(formData.get("cantidad"));
  let materiaPrimaId = String(formData.get("materiaPrimaId") ?? "").trim();

  if (!materiaPrimaId && nuevoInsumo) materiaPrimaId = await insumoIdOCrear(nuevoInsumo, nuevaUnidad);
  if ((!productoId && !saborId && !linea) || !materiaPrimaId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  await prisma.recetaItem.create({ data: { productoId, saborId, linea, grupo, materiaPrimaId, cantidad } });

  const dest = linea ? `linea=${linea}` : productoId ? `producto=${productoId}` : `sabor=${saborId}`;
  revalidatePath("/admin/materias/recetas");
  redirect(`/admin/materias/recetas?${dest}`);
}

/** Guarda la guía de una receta (link de video + paso a paso) por tipo/producto/sabor. */
export async function guardarGuiaReceta(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim() || null;
  const productoId = String(formData.get("productoId") ?? "").trim() || null;
  const saborId = String(formData.get("saborId") ?? "").trim() || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
  const pasos = String(formData.get("pasos") ?? "").trim() || null;
  if (!linea && !productoId && !saborId) return;

  const where = linea ? { linea } : productoId ? { productoId } : { saborId };
  const existe = await prisma.recetaGuia.findFirst({ where });
  if (existe) {
    await prisma.recetaGuia.update({ where: { id: existe.id }, data: { videoUrl, pasos } });
  } else {
    await prisma.recetaGuia.create({ data: { linea, productoId, saborId, videoUrl, pasos } });
  }

  const dest = linea ? `linea=${linea}` : productoId ? `producto=${productoId}` : `sabor=${saborId}`;
  revalidatePath("/admin/materias/recetas");
  revalidatePath("/produccion");
  redirect(`/admin/materias/recetas?${dest}`);
}

/** Crea una medida/recipiente (balde, máquina 60L…) con su equivalencia en litros/kg. */
export async function crearMedida(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const litros = Number(String(formData.get("litros") ?? "").trim().replace(",", "."));
  if (!nombre || !Number.isFinite(litros) || litros <= 0) return;
  await prisma.medida.create({ data: { nombre, litros } });
  revalidatePath("/admin/materias/recetas");
}

/** Elimina una medida. */
export async function eliminarMedida(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.medida.delete({ where: { id } });
  revalidatePath("/admin/materias/recetas");
}

/** Precarga medidas típicas (una vez). */
export async function precargarMedidas() {
  const base = [
    { nombre: "Balde", litros: 19 },
    { nombre: "Depósito", litros: 20 },
    { nombre: "Máquina chica (30 L)", litros: 30 },
    { nombre: "Máquina grande (60 L)", litros: 60 },
  ];
  for (const m of base) {
    const ex = await prisma.medida.findFirst({ where: { nombre: m.nombre } });
    if (!ex) await prisma.medida.create({ data: m });
  }
  revalidatePath("/admin/materias/recetas");
}

/**
 * Precarga la receta base de ejemplo (Tú y Yo / Paletas de leche) para 120 L:
 * azúcar 19 kg, leche 12 kg, estabilizante neutro 300 g, edulcorante 45 g.
 * Crea los insumos si no existen. Todo queda editable. No duplica si ya está.
 */
export async function precargarRecetaEjemplo() {
  const insumos: { nombre: string; unidad: string; cant: number }[] = [
    { nombre: "Azúcar", unidad: "kg", cant: 19 },
    { nombre: "Leche", unidad: "kg", cant: 12 },
    { nombre: "Estabilizante neutro paletas", unidad: "g", cant: 300 },
    { nombre: "Edulcorante", unidad: "g", cant: 45 },
  ];
  // Tú y Yo y Paletas de leche comparten esta base (líneas de producción).
  for (const linea of ["tuyyo", "paletas"]) {
    await prisma.recetaBase.upsert({
      where: { linea },
      update: { baseRef: 120, baseUnidad: "l" },
      create: { linea, baseRef: 120, baseUnidad: "l" },
    });
    for (const it of insumos) {
      const mpId = await insumoIdOCrear(it.nombre, it.unidad);
      const ex = await prisma.recetaItem.findFirst({ where: { linea, materiaPrimaId: mpId } });
      if (!ex) await prisma.recetaItem.create({ data: { linea, materiaPrimaId: mpId, cantidad: it.cant } });
    }
  }
  revalidatePath("/admin/materias/recetas");
  redirect("/admin/materias/recetas?linea=tuyyo");
}

/** Guarda el lote de referencia de la receta base de un tipo (para cuántos L/kg). */
export async function guardarBaseRef(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim();
  const baseRef = Number(String(formData.get("baseRef") ?? "").trim().replace(",", "."));
  const baseUnidad = String(formData.get("baseUnidad") ?? "l").trim() === "kg" ? "kg" : "l";
  if (!linea || !Number.isFinite(baseRef) || baseRef <= 0) return;
  await prisma.recetaBase.upsert({
    where: { linea },
    update: { baseRef, baseUnidad },
    create: { linea, baseRef, baseUnidad },
  });
  revalidatePath("/admin/materias/recetas");
  redirect(`/admin/materias/recetas?linea=${linea}`);
}

/** Quita un insumo de una receta. */
export async function quitarRecetaItem(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const volver = String(formData.get("volver") ?? "").trim();
  if (!id) return;
  await prisma.recetaItem.delete({ where: { id } });
  revalidatePath("/admin/materias/recetas");
  if (volver) redirect(`/admin/materias/recetas?${volver}`);
}
