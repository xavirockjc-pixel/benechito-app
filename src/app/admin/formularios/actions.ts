"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { parseCampos, type CampoForm } from "@/lib/dominio/checklists";

function normalizarCampos(json: string): string {
  const campos = parseCampos(json).map((c, i) => ({
    id: c.id && String(c.id).trim() ? String(c.id) : `c${i}_${Date.now().toString(36)}`,
    label: String(c.label ?? "").trim() || `Campo ${i + 1}`,
    tipo: ["si_no", "texto", "numero", "opcion"].includes(c.tipo) ? c.tipo : "si_no",
    requerido: !!c.requerido,
    ...(Array.isArray(c.opciones) && c.opciones.length ? { opciones: c.opciones.map((o) => String(o)) } : {}),
  }));
  return JSON.stringify(campos);
}

/** Crea una plantilla de checklist. */
export async function crearFormulario(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  await prisma.formulario.create({
    data: {
      nombre,
      categoria: String(formData.get("categoria") ?? "higiene"),
      rol: String(formData.get("rol") ?? "todos"),
      frecuencia: String(formData.get("frecuencia") ?? "diaria"),
      campos: normalizarCampos(String(formData.get("campos") ?? "[]")),
      activo: String(formData.get("activo") ?? "si") !== "no",
    },
  });
  revalidatePath("/admin/formularios");
  redirect("/admin/formularios");
}

/** Edita una plantilla existente. */
export async function actualizarFormulario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return;
  await prisma.formulario.update({
    where: { id },
    data: {
      nombre,
      categoria: String(formData.get("categoria") ?? "higiene"),
      rol: String(formData.get("rol") ?? "todos"),
      frecuencia: String(formData.get("frecuencia") ?? "diaria"),
      campos: normalizarCampos(String(formData.get("campos") ?? "[]")),
    },
  });
  revalidatePath("/admin/formularios");
  redirect("/admin/formularios");
}

/** Activa/desactiva una plantilla (aplica a todas las apps del rol). */
export async function toggleFormulario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const f = await prisma.formulario.findUnique({ where: { id }, select: { activo: true } });
  if (!f) return;
  await prisma.formulario.update({ where: { id }, data: { activo: !f.activo } });
  revalidatePath("/admin/formularios");
}

/** Elimina una plantilla (y sus respuestas). */
export async function borrarFormulario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.formulario.delete({ where: { id } });
  revalidatePath("/admin/formularios");
}

/** Guarda un checklist completado (desde la app del trabajador). */
export async function responderFormulario(formData: FormData) {
  const formularioId = String(formData.get("formularioId") ?? "").trim();
  const volver = String(formData.get("volver") ?? "").trim() || "/admin/formularios";
  if (!formularioId) return;

  const form = await prisma.formulario.findUnique({ where: { id: formularioId } });
  if (!form) return;

  const campos: CampoForm[] = parseCampos(form.campos);
  const respuestas: Record<string, string> = {};
  for (const c of campos) {
    const raw = formData.get(`c_${c.id}`);
    respuestas[c.id] = c.tipo === "si_no" ? (raw ? "si" : "no") : String(raw ?? "").trim();
  }

  const u = await usuarioActual();
  await prisma.formularioRespuesta.create({
    data: {
      formularioId,
      usuarioId: u?.sub ?? null,
      usuarioNombre: u?.nombre ?? null,
      rol: u?.rol ?? form.rol,
      respuestas: JSON.stringify(respuestas),
      notas: String(formData.get("notas") ?? "").trim() || null,
    },
  });

  revalidatePath(volver);
  redirect(`${volver}?ok=1`);
}

/** Crea un set de plantillas sugeridas de partida (higiene, temperaturas, etc.). */
export async function sembrarFormularios() {
  const n = await prisma.formulario.count();
  if (n > 0) {
    revalidatePath("/admin/formularios");
    return;
  }
  const sugeridos = [
    { nombre: "Higiene personal antes de producción", categoria: "higiene", rol: "produccion", frecuencia: "diaria",
      campos: [
        { id: "manos", label: "Lavado de manos", tipo: "si_no", requerido: true },
        { id: "cofia", label: "Cofia y delantal limpios", tipo: "si_no", requerido: true },
        { id: "unas", label: "Uñas cortas y sin esmalte", tipo: "si_no" },
        { id: "obs", label: "Observaciones", tipo: "texto" },
      ] },
    { nombre: "Temperatura de cámaras y equipos", categoria: "temperatura", rol: "caja", frecuencia: "diaria",
      campos: [
        { id: "congelador", label: "Congelador (°C)", tipo: "numero", requerido: true },
        { id: "vitrina", label: "Vitrina helados (°C)", tipo: "numero" },
        { id: "refri", label: "Refrigerador (°C)", tipo: "numero" },
        { id: "obs", label: "Observaciones", tipo: "texto" },
      ] },
    { nombre: "Limpieza y sanitización del local", categoria: "limpieza", rol: "caja", frecuencia: "diaria",
      campos: [
        { id: "pisos", label: "Pisos y superficies", tipo: "si_no", requerido: true },
        { id: "vitrina", label: "Vitrina y mesón", tipo: "si_no", requerido: true },
        { id: "banos", label: "Baños", tipo: "si_no" },
      ] },
    { nombre: "Higiene y seguridad en bodega", categoria: "higiene", rol: "bodega", frecuencia: "diaria",
      campos: [
        { id: "orden", label: "Bodega ordenada y sin obstáculos", tipo: "si_no", requerido: true },
        { id: "epp", label: "Uso de EPP (guantes/calzado)", tipo: "si_no" },
        { id: "plagas", label: "Sin señales de plagas", tipo: "si_no" },
        { id: "obs", label: "Observaciones", tipo: "texto" },
      ] },
    { nombre: "Checklist recepción de mercadería", categoria: "logistica", rol: "bodega", frecuencia: "por_evento",
      campos: [
        { id: "temp", label: "Cadena de frío OK (°C)", tipo: "numero" },
        { id: "vence", label: "Fechas de vencimiento OK", tipo: "si_no", requerido: true },
        { id: "estado", label: "Envases en buen estado", tipo: "si_no" },
      ] },
    { nombre: "Revisión del vehículo antes de salir", categoria: "revision", rol: "vendedor", frecuencia: "diaria",
      campos: [
        { id: "frio", label: "Equipo de frío funcionando", tipo: "si_no", requerido: true },
        { id: "combustible", label: "Combustible suficiente", tipo: "si_no" },
        { id: "limpieza", label: "Vehículo limpio", tipo: "si_no" },
        { id: "obs", label: "Observaciones", tipo: "texto" },
      ] },
  ];
  for (const [i, s] of sugeridos.entries()) {
    await prisma.formulario.create({ data: { nombre: s.nombre, categoria: s.categoria, rol: s.rol, frecuencia: s.frecuencia, orden: i, campos: JSON.stringify(s.campos) } });
  }
  revalidatePath("/admin/formularios");
}
