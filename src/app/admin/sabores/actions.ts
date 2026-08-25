"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Normaliza un texto a un código simple (para `codigo`/`linea`). */
function codigoDe(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "otro";
}

// ---------------------------------------------------------------- TIPOS
/** Crea un tipo dentro de una sección (dulce/helado o una nueva). */
export async function crearTipo(formData: FormData) {
  const nombre = val(formData, "nombre");
  const seccion = (val(formData, "seccionNueva") || val(formData, "seccion") || "helado");
  if (!nombre) return;
  const codigo = codigoDe(nombre);
  await prisma.tipo.upsert({
    where: { codigo },
    update: { nombre, seccion, activo: true },
    create: { codigo, nombre, seccion },
  });
  revalidatePath("/admin/sabores");
}

/** Elimina un tipo y todos sus sabores/formatos. */
export async function eliminarTipo(formData: FormData) {
  const codigo = val(formData, "codigo");
  if (!codigo) return;
  await prisma.sabor.deleteMany({ where: { linea: codigo } });
  await prisma.formato.deleteMany({ where: { linea: codigo } });
  await prisma.tipo.deleteMany({ where: { codigo } });
  revalidatePath("/admin/sabores");
}

/** Cambia la sección de un tipo. */
export async function moverTipoSeccion(formData: FormData) {
  const codigo = val(formData, "codigo");
  const seccion = val(formData, "seccion") || "helado";
  if (!codigo) return;
  await prisma.tipo.updateMany({ where: { codigo }, data: { seccion } });
  await prisma.sabor.updateMany({ where: { linea: codigo }, data: { seccion } });
  revalidatePath("/admin/sabores");
}

// ---------------------------------------------------------------- SABORES
/** Agrega UNO o VARIOS sabores a un tipo (separa por coma o "y"). Sirve para voz. */
export async function crearSabor(formData: FormData) {
  const texto = val(formData, "nombre");
  const linea = val(formData, "linea");
  if (!texto || !linea) return;

  const tipo = await prisma.tipo.findUnique({ where: { codigo: linea }, select: { seccion: true } });
  const seccion = tipo?.seccion ?? null;

  const nombres = texto.split(/,| y /).map((s) => s.trim()).filter(Boolean);
  for (const nombre of nombres) {
    const existe = await prisma.sabor.findFirst({ where: { nombre, linea } });
    if (!existe) await prisma.sabor.create({ data: { nombre, linea, seccion } });
  }
  revalidatePath("/admin/sabores");
}

/** Elimina un sabor (si tiene uso, se desactiva). */
export async function eliminarSabor(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  try { await prisma.sabor.delete({ where: { id } }); }
  catch { await prisma.sabor.update({ where: { id }, data: { activo: false } }); }
  revalidatePath("/admin/sabores");
}

// ---------------------------------------------------------------- FORMATOS
/** Agrega un formato (general o de un tipo). */
export async function crearFormato(formData: FormData) {
  const nombre = val(formData, "nombre");
  const linea = val(formData, "linea") || null;
  if (!nombre) return;
  const existe = await prisma.formato.findFirst({ where: { nombre, linea } });
  if (!existe) await prisma.formato.create({ data: { nombre, linea } });
  revalidatePath("/admin/sabores");
}

/** Elimina un formato. */
export async function eliminarFormato(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.formato.delete({ where: { id } });
  revalidatePath("/admin/sabores");
}

// ---------------------------------------------------------------- PRECARGA
/** Precarga los tipos y formatos base de Benechito (una sola vez, no duplica). */
export async function precargarBase() {
  const tipos: { nombre: string; seccion: string }[] = [
    { nombre: "Cuchuflí", seccion: "dulce" },
    { nombre: "Trufas", seccion: "dulce" },
    { nombre: "Cocadas", seccion: "dulce" },
    { nombre: "Paletas de agua", seccion: "helado" },
    { nombre: "Paletas de leche", seccion: "helado" },
    { nombre: "Tú y Yo", seccion: "helado" },
    { nombre: "Paletas Premium", seccion: "helado" },
    { nombre: "Postres 500ml", seccion: "helado" },
    { nombre: "Postres 1 litro", seccion: "helado" },
    { nombre: "Postres 5 litros", seccion: "helado" },
    { nombre: "Vasos", seccion: "helado" },
  ];
  for (const t of tipos) {
    const codigo = codigoDe(t.nombre);
    await prisma.tipo.upsert({ where: { codigo }, update: {}, create: { codigo, nombre: t.nombre, seccion: t.seccion } });
  }
  // Formatos base por tipo.
  const formatos: { nombre: string; linea: string }[] = [
    { nombre: "Pack 9", linea: codigoDe("Cuchuflí") },
    { nombre: "Pack 5", linea: codigoDe("Cuchuflí") },
    { nombre: "Bandeja 50", linea: codigoDe("Cuchuflí") },
    { nombre: "Bandeja 80", linea: codigoDe("Cuchuflí") },
    { nombre: "3 unidades", linea: codigoDe("Trufas") },
    { nombre: "Bandeja 40", linea: codigoDe("Trufas") },
    { nombre: "Bandeja 40", linea: codigoDe("Cocadas") },
    { nombre: "500 ml", linea: codigoDe("Postres 500ml") },
    { nombre: "1 litro", linea: codigoDe("Postres 1 litro") },
    { nombre: "5 litros", linea: codigoDe("Postres 5 litros") },
    { nombre: "Vaso", linea: codigoDe("Vasos") },
  ];
  for (const f of formatos) {
    const ex = await prisma.formato.findFirst({ where: { nombre: f.nombre, linea: f.linea } });
    if (!ex) await prisma.formato.create({ data: f });
  }
  revalidatePath("/admin/sabores");
}
