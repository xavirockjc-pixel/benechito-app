"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { empresaActual } from "@/lib/dominio/empresa";
import { RUBROS } from "@/lib/dominio/rubros";

/** Cambia el rubro (plantilla) de la empresa: renombra áreas y ajusta módulos. */
export async function cambiarRubro(formData: FormData) {
  const rubro = String(formData.get("rubro") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!(rubro in RUBROS)) return;

  const e = await empresaActual();
  await prisma.empresa.update({
    where: { id: e.id },
    data: { rubro, ...(nombre ? { nombre } : {}) },
  });

  // Refresca todo lo que muestra nombres de áreas.
  ["/admin", "/vendedor", "/caja", "/bodega", "/produccion"].forEach((r) => revalidatePath(r, "layout"));
  redirect("/admin/rubro?ok=1");
}
