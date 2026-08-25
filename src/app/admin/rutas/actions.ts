"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { esEstadoRuta, esEstadoParada } from "@/lib/dominio/ruta";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Crea una ruta con los clientes seleccionados como paradas. */
export async function crearRuta(formData: FormData) {
  const nombre = val(formData, "nombre") || null;
  const fechaStr = val(formData, "fecha");
  const vendedorId = val(formData, "vendedorId") || null;
  const ids = formData.getAll("negocioIds").map((x) => String(x)).filter(Boolean);
  if (ids.length === 0) return;

  const ruta = await prisma.ruta.create({
    data: {
      nombre,
      fecha: fechaStr ? new Date(fechaStr) : new Date(),
      vendedorId,
      estado: "planificada",
      paradas: { create: ids.map((negocioId, i) => ({ negocioId, orden: i })) },
    },
  });

  revalidatePath("/admin/rutas");
  redirect(`/admin/rutas/${ruta.id}`);
}

/** Asigna (o cambia) el vendedor de la ruta. */
export async function asignarVendedor(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  const vendedorId = val(formData, "vendedorId") || null;
  if (!rutaId) return;
  await prisma.ruta.update({ where: { id: rutaId }, data: { vendedorId } });
  revalidatePath(`/admin/rutas/${rutaId}`);
}

/** Agrega un cliente como parada de la ruta. */
export async function agregarParada(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  const negocioId = val(formData, "negocioId");
  if (!rutaId || !negocioId) return;
  const max = await prisma.paradaRuta.aggregate({ where: { rutaId }, _max: { orden: true } });
  await prisma.paradaRuta.upsert({
    where: { rutaId_negocioId: { rutaId, negocioId } },
    update: {},
    create: { rutaId, negocioId, orden: (max._max.orden ?? -1) + 1 },
  });
  revalidatePath(`/admin/rutas/${rutaId}`);
}

/** Agrega VARIOS negocios a la ruta de una vez (por sector o rezagados). */
async function agregarVarios(rutaId: string, ids: string[]) {
  if (!rutaId || ids.length === 0) return;
  let max = (await prisma.paradaRuta.aggregate({ where: { rutaId }, _max: { orden: true } }))._max.orden ?? -1;
  for (const negocioId of ids) {
    max += 1;
    await prisma.paradaRuta.upsert({
      where: { rutaId_negocioId: { rutaId, negocioId } },
      update: {},
      create: { rutaId, negocioId, orden: max },
    });
  }
  revalidatePath(`/admin/rutas/${rutaId}`);
}

/** Agrega todos los clientes de un sector (o comuna) a la ruta. */
export async function agregarSector(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  const sector = val(formData, "sector");
  if (!rutaId || !sector) return;
  const clientes = await prisma.negocio.findMany({
    where: { OR: [{ sector }, { AND: [{ sector: null }, { comuna: sector }] }] },
    select: { id: true },
  });
  await agregarVarios(rutaId, clientes.map((c) => c.id));
}

/** Agrega los REZAGADOS (con próxima reposición vencida) a la ruta. */
export async function agregarRezagados(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  if (!rutaId) return;
  const hoy = new Date();
  const clientes = await prisma.negocio.findMany({
    where: { estado: { in: ["punto_activo", "reposicion"] }, proximaReposicion: { lte: hoy } },
    select: { id: true },
  });
  await agregarVarios(rutaId, clientes.map((c) => c.id));
}

/** Quita una parada de la ruta. */
export async function quitarParada(formData: FormData) {
  const paradaId = val(formData, "paradaId");
  const rutaId = val(formData, "rutaId");
  if (!paradaId) return;
  await prisma.paradaRuta.delete({ where: { id: paradaId } });
  revalidatePath(`/admin/rutas/${rutaId}`);
}

/** Marca el resultado de una parada (usado por admin y por el vendedor). */
export async function marcarParada(formData: FormData) {
  const paradaId = val(formData, "paradaId");
  const estado = val(formData, "estado");
  if (!paradaId || !esEstadoParada(estado)) return;
  const parada = await prisma.paradaRuta.update({ where: { id: paradaId }, data: { estado } });
  revalidatePath(`/admin/rutas/${parada.rutaId}`);
  revalidatePath("/vendedor/ruta");
}

/** Cambia el estado de la ruta (planificada/en_curso/cerrada). */
export async function cambiarEstadoRuta(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  const estado = val(formData, "estado");
  if (!rutaId || !esEstadoRuta(estado)) return;
  await prisma.ruta.update({ where: { id: rutaId }, data: { estado } });
  revalidatePath(`/admin/rutas/${rutaId}`);
  revalidatePath("/admin/rutas");
  revalidatePath("/vendedor/ruta");
}

/** Elimina una ruta (y sus paradas). */
export async function eliminarRuta(formData: FormData) {
  const rutaId = val(formData, "rutaId");
  if (!rutaId) return;
  await prisma.ruta.delete({ where: { id: rutaId } });
  revalidatePath("/admin/rutas");
  redirect("/admin/rutas");
}
