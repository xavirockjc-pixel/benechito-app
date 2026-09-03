"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RUBROS, type RubroId } from "@/lib/dominio/rubros";
import { empresaActual } from "@/lib/dominio/empresa";
import { precargarRubro } from "@/lib/dominio/seed-rubro";

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

/**
 * Precarga los datos base del rubro actual (sucursal, ubicaciones, listas de
 * precio y tipos/formatos). Idempotente: no duplica si ya existen.
 */
export async function precargarDatosRubro() {
  const empresa = await empresaActual();
  const rubro = (empresa.rubro in RUBROS ? empresa.rubro : "fabrica") as RubroId;
  await precargarRubro(empresa.id, rubro);
  revalidatePath("/admin", "layout");
  redirect("/admin/configuracion?seed=ok");
}
