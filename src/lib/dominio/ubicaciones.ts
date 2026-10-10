import { prisma } from "@/lib/prisma";

/** Ubicación de Bodega (almacén / lo que se vende y distribuye). */
export async function ubicacionBodega() {
  return prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
}

/**
 * Ubicación de Producción: donde cae lo que se fabrica ANTES de recibirse en
 * bodega. Así el stock de producción no choca con el de bodega. Se crea sola
 * (en la misma sucursal de la bodega) la primera vez que se necesita.
 */
export async function ubicacionProduccion() {
  const existe = await prisma.ubicacion.findFirst({ where: { tipo: "produccion" } });
  if (existe) return existe;
  const bod = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  const sucursalId = bod?.sucursalId ?? (await prisma.sucursal.findFirst())?.id;
  if (!sucursalId) return null;
  return prisma.ubicacion.create({ data: { nombre: "Producción", tipo: "produccion", sucursalId } });
}

export async function ubicacionBodegaId() {
  return (await ubicacionBodega())?.id ?? null;
}
export async function ubicacionProduccionId() {
  return (await ubicacionProduccion())?.id ?? null;
}
