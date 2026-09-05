"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d]/g, ""));

/**
 * Registra una compra/gasto. Si tiene factura, guarda el IVA crédito.
 * Se ingresa el TOTAL pagado; el IVA se calcula como total × 19/119.
 */
export async function registrarCompra(formData: FormData) {
  const concepto = val(formData, "concepto");
  const total = numero(val(formData, "total"));
  if (!concepto || !Number.isFinite(total) || total <= 0) return;

  const conFactura = formData.get("conFactura") === "on";
  const iva = conFactura ? Math.round((total * 19) / 119) : null;
  const fechaStr = val(formData, "fecha");
  const fecha = fechaStr ? new Date(fechaStr) : new Date();

  await prisma.gasto.create({
    data: {
      concepto,
      monto: total,
      categoria: val(formData, "categoria") || "insumos",
      proveedor: val(formData, "proveedor") || null,
      conFactura,
      iva,
      fecha: isNaN(fecha.getTime()) ? new Date() : fecha,
    },
  });
  revalidatePath("/admin/iva");
  revalidatePath("/admin/finanzas");
}

/** Borra una compra/gasto. */
export async function eliminarCompra(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.gasto.delete({ where: { id } });
  revalidatePath("/admin/iva");
  revalidatePath("/admin/finanzas");
}
