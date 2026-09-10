"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d.]/g, ""));

function refrescar() {
  revalidatePath("/admin/estado-financiero");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/panorama");
}

/** Registra una deuda por pagar (del negocio o personal). */
export async function crearDeuda(formData: FormData) {
  const acreedor = val(formData, "acreedor");
  const monto = numero(val(formData, "monto"));
  if (!acreedor || !Number.isFinite(monto) || monto <= 0) return;
  const venceStr = val(formData, "fechaVence");
  await prisma.deuda.create({
    data: {
      acreedor,
      motivo: val(formData, "motivo") || null,
      monto,
      personal: val(formData, "personal") === "1",
      categoria: val(formData, "categoria") || null,
      fechaVence: venceStr ? new Date(venceStr) : null,
    },
  });
  refrescar();
}

/** Abona a una deuda por pagar. Si se salda, queda "pagada". */
export async function abonarDeudaPropia(formData: FormData) {
  const id = val(formData, "id");
  const abono = numero(val(formData, "abono"));
  if (!id || !Number.isFinite(abono) || abono <= 0) return;
  const d = await prisma.deuda.findUnique({ where: { id } });
  if (!d) return;
  const pagado = Math.min(Number(d.monto), Number(d.pagado) + abono);
  await prisma.deuda.update({
    where: { id },
    data: { pagado, estado: pagado >= Number(d.monto) ? "pagada" : "pendiente" },
  });
  refrescar();
}

/** Elimina una deuda. */
export async function eliminarDeuda(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.deuda.delete({ where: { id } });
  refrescar();
}

/** Registra un gasto personal (fuera del trabajo). */
export async function registrarGastoPersonal(formData: FormData) {
  const concepto = val(formData, "concepto");
  const monto = numero(val(formData, "monto"));
  if (!concepto || !Number.isFinite(monto) || monto <= 0) return;
  await prisma.gasto.create({
    data: { concepto, monto, categoria: val(formData, "categoria") || "personal", personal: true },
  });
  refrescar();
}
