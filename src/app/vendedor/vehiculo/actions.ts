"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { TIPOS_GASTO, CHECKLIST_VEHICULO, ESTADOS_REVISION } from "@/lib/dominio/vehiculo";

const num = (v: FormDataEntryValue | null) => Math.max(0, Number(String(v ?? "0").replace(",", ".")) || 0);

async function miVehiculoId(): Promise<string | null> {
  const u = await usuarioActual();
  if (!u?.sub) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } });
  return usuario?.vehiculoId ?? null;
}

/** Registra un gasto del vehículo (combustible u otro). */
export async function registrarGastoVehiculo(formData: FormData) {
  const tipoRaw = String(formData.get("tipo") ?? "combustible").trim();
  const tipo = (TIPOS_GASTO as readonly string[]).includes(tipoRaw) ? tipoRaw : "otro";
  const monto = num(formData.get("monto"));
  const litros = num(formData.get("litros"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const canal = String(formData.get("canal") ?? "").trim() || null;
  if (monto <= 0 && litros <= 0) return;
  const u = await usuarioActual();
  await prisma.gastoVehiculo.create({
    data: {
      tipo, monto, litros, notas, canal,
      vehiculoId: await miVehiculoId(),
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/vendedor/vehiculo");
  revalidatePath("/admin/repartos");
}

/** Guarda la revisión (checklist) del vehículo con km de salida/entrada. */
export async function guardarRevisionVehiculo(formData: FormData) {
  const u = await usuarioActual();
  const estado = (campo: string) => {
    const v = String(formData.get(campo) ?? "ok").trim();
    return (ESTADOS_REVISION as readonly string[]).includes(v) ? v : "ok";
  };
  const data: Record<string, unknown> = {
    kmSalida: num(formData.get("kmSalida")),
    kmEntrada: num(formData.get("kmEntrada")),
    observaciones: String(formData.get("observaciones") ?? "").trim() || null,
    vehiculoId: await miVehiculoId(),
    usuarioId: u?.sub ?? null,
    nombreUsuario: u?.nombre ?? null,
  };
  for (const it of CHECKLIST_VEHICULO) data[it.campo] = estado(it.campo);
  await prisma.revisionVehiculo.create({ data: data as never });
  revalidatePath("/vendedor/vehiculo");
  revalidatePath("/admin/repartos");
}
