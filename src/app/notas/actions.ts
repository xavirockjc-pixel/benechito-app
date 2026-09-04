"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  AREAS_NOTA, TIPOS_NOTA, normalizaTexto,
  detectaAccionNota, detectaCantidad, detectaFechaNota, matchProducto,
} from "@/lib/dominio/notas";
import { PRIORIDADES } from "@/lib/dominio/mejoras";

const pick = <T extends readonly string[]>(v: FormDataEntryValue | null, opts: T, def: T[number]): T[number] => {
  const s = String(v ?? "").trim();
  return (opts as readonly string[]).includes(s) ? (s as T[number]) : def;
};

function revalidar() {
  revalidatePath("/admin/notas");
  revalidatePath("/admin/supercerebro");
  revalidatePath("/admin/inventario");
}

/** Aplica una variación de stock en una ubicación (upsert), igual que el módulo inventario. */
async function aplicarDelta(productoId: string, ubicacionId: string, delta: number) {
  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    update: { cantidad: { increment: delta } },
    create: { productoId, ubicacionId, cantidad: delta },
  });
}

/** Ubicación por defecto para movimientos desde notas (bodega, si existe). */
async function ubicacionPrincipal() {
  return (
    (await prisma.ubicacion.findFirst({ where: { activo: true, tipo: "bodega" } })) ??
    (await prisma.ubicacion.findFirst({ where: { activo: true } })) ??
    (await prisma.ubicacion.findFirst())
  );
}

/** Crea una nota rápida (desde cualquier app) y detecta si implica una acción. */
export async function crearNota(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  let tipo = pick(formData.get("tipo"), TIPOS_NOTA, "observacion");
  const area = pick(formData.get("area"), AREAS_NOTA, "general");
  let prioridad = pick(formData.get("prioridad"), PRIORIDADES, "media");
  const autor = String(formData.get("autor") ?? "").trim() || null;

  const n = normalizaTexto(texto);
  const accion = detectaAccionNota(n);
  const cantidad = detectaCantidad(n);
  let productoId: string | null = null;
  let itemNombre: string | null = null;
  let fechaObjetivo: Date | null = null;
  let accionEstado = "na";

  if (accion === "stock_entrada" || accion === "stock_salida") {
    const productos = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
    const m = matchProducto(n, productos);
    productoId = m?.id ?? null;
    itemNombre = m?.nombre ?? null;
    accionEstado = "sugerida"; // queda a un clic de aplicarse
    if (tipo === "observacion") tipo = "tarea";
  } else if (accion === "reponer") {
    tipo = "tarea";
    if (prioridad === "media") prioridad = "alta";
    fechaObjetivo = detectaFechaNota(n);
  }

  await prisma.nota.create({
    data: { texto, tipo, area, prioridad, autor, accion, accionEstado, productoId, itemNombre, cantidad, fechaObjetivo },
  });
  revalidar();
}

/** Marca una nota como hecha / la reabre. */
export async function toggleNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const actual = await prisma.nota.findUnique({ where: { id }, select: { estado: true } });
  if (!actual) return;
  const hecha = actual.estado !== "hecha";
  await prisma.nota.update({
    where: { id },
    data: { estado: hecha ? "hecha" : "abierta", hechaEn: hecha ? new Date() : null },
  });
  revalidar();
}

/** Borra una nota. */
export async function eliminarNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.nota.delete({ where: { id } });
  revalidar();
}

/**
 * Aplica la acción sugerida de una nota: mueve stock de verdad.
 * Resuelve el producto (o lo crea si no existía) y registra el MovimientoStock.
 */
export async function aplicarAccionNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const nota = await prisma.nota.findUnique({ where: { id } });
  if (!nota || nota.accionEstado !== "sugerida") return;

  const cantidad = Math.abs(Number(String(formData.get("cantidad") ?? nota.cantidad ?? "").trim()));
  if (!Number.isFinite(cantidad) || cantidad <= 0) return;

  // Producto: el elegido en el formulario, o crear uno nuevo con el nombre dado.
  let productoId = String(formData.get("productoId") ?? "").trim() || nota.productoId || "";
  const nuevoNombre = String(formData.get("nuevoProducto") ?? "").trim();
  if (!productoId && nuevoNombre) {
    const creado = await prisma.producto.create({
      data: { linea: "insumo", nombre: nuevoNombre, tipo: "reventa", seccion: "distribucion", activo: true },
    });
    productoId = creado.id;
  }
  if (!productoId) return; // sin producto no se puede aplicar

  const ubic = await ubicacionPrincipal();
  if (!ubic) return;

  let movTipo = "";
  if (nota.accion === "stock_entrada") {
    await aplicarDelta(productoId, ubic.id, cantidad);
    movTipo = "ingreso";
    const mov = await prisma.movimientoStock.create({
      data: { productoId, tipo: movTipo, ubicacionDestinoId: ubic.id, cantidad, referencia: `nota:${id}` },
    });
    await prisma.nota.update({
      where: { id },
      data: { accionEstado: "aplicada", estado: "hecha", hechaEn: new Date(), productoId, cantidad, refMovimientoId: mov.id },
    });
  } else if (nota.accion === "stock_salida") {
    await aplicarDelta(productoId, ubic.id, -cantidad);
    movTipo = "venta";
    const mov = await prisma.movimientoStock.create({
      data: { productoId, tipo: movTipo, ubicacionOrigenId: ubic.id, cantidad, referencia: `nota:${id}` },
    });
    await prisma.nota.update({
      where: { id },
      data: { accionEstado: "aplicada", estado: "hecha", hechaEn: new Date(), productoId, cantidad, refMovimientoId: mov.id },
    });
  } else {
    return;
  }
  revalidar();
}

/** Descarta la acción sugerida (deja la nota como nota normal). */
export async function descartarAccionNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.nota.update({ where: { id }, data: { accionEstado: "descartada" } });
  revalidar();
}
