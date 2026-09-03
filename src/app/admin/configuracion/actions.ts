"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { RUBROS, type RubroId } from "@/lib/dominio/rubros";
import { empresaActual } from "@/lib/dominio/empresa";

/**
 * Actualiza la configuración del negocio (Empresa): su nombre y su RUBRO.
 * El rubro cambia —con el mismo motor— los nombres de las áreas, los colores y
 * qué módulos se ven u ocultan. Es la pieza clave del modelo "un motor, muchas colmenas".
 */
export async function actualizarEmpresa(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rubro = String(formData.get("rubro") ?? "").trim();
  const empresa = await empresaActual();

  const data: { nombre?: string; rubro?: string } = {};
  if (nombre) data.nombre = nombre;
  if (rubro && rubro in RUBROS) data.rubro = rubro as RubroId;
  if (Object.keys(data).length === 0) return;

  await prisma.empresa.update({ where: { id: empresa.id }, data });

  // El rubro afecta menú, etiquetas y tema → revalidar todo el panel.
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/configuracion");
}
