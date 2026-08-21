"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion } from "@/lib/auth";
import { estadoPagoDe, MEDIOS_PAGO } from "@/lib/dominio/ventas";

type LineaTerreno = { productoId: string; cantidad: number; precioUnit: number };

/** Cierra la sesión del vendedor. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

/** Recalcula el estado de pago de una venta según sus abonos. */
async function recalcularEstadoPago(ventaId: string) {
  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, include: { pagos: true } });
  if (!venta) return;
  const pagado = venta.pagos.reduce((s, p) => s + Number(p.monto), 0);
  await prisma.venta.update({
    where: { id: ventaId },
    data: { estadoPago: estadoPagoDe(Number(venta.total), pagado) },
  });
}

/**
 * Venta en terreno: crea la venta al cliente con los precios de su lista. Según el modo
 * de pago queda pagada (efectivo/transferencia) o a crédito (pendiente → cuenta corriente).
 * (El descuento de stock del vehículo se conecta en la parte de "carga de ruta".)
 */
export async function venderTerreno(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const modo = String(formData.get("modo") ?? "credito").trim(); // efectivo|transferencia|credito
  const raw = String(formData.get("items") ?? "[]");
  if (!negocioId) return;

  let items: LineaTerreno[] = [];
  try {
    items = JSON.parse(raw);
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0 && i.precioUnit >= 0);
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);

  const ubicacion =
    (await prisma.ubicacion.findFirst({ where: { tipo: "vehiculo" } })) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  if (!ubicacion) return;

  const aCredito = modo === "credito";
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) ? modo : "efectivo";

  await prisma.venta.create({
    data: {
      negocioId,
      ubicacionId: ubicacion.id,
      total,
      estadoPago: aCredito ? "pendiente" : "pagado",
      documento: "boleta",
      ...(aCredito ? {} : { pagos: { create: { medio, monto: total } } }),
    },
  });

  await prisma.actividad.create({
    data: {
      negocioId,
      tipo: "venta",
      descripcion: aCredito ? `Venta a crédito por $${total}` : `Venta por $${total} (${medio})`,
    },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

/** Registra un abono a una venta pendiente del cliente (cobranza en terreno). */
export async function registrarCobro(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const medio = String(formData.get("medio") ?? "efectivo").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(",", "."));
  if (!ventaId || !(MEDIOS_PAGO as readonly string[]).includes(medio)) return;
  if (!Number.isFinite(monto) || monto <= 0) return;

  await prisma.pago.create({ data: { ventaId, medio, monto } });
  await recalcularEstadoPago(ventaId);
  if (negocioId) {
    await prisma.actividad.create({
      data: { negocioId, tipo: "contacto", descripcion: `Cobranza: abono de $${monto} (${medio})` },
    });
  }

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

/** Registra el resultado de la visita (nota + próxima visita opcional). */
export async function registrarResultado(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const resultado = String(formData.get("resultado") ?? "").trim();
  const proximaStr = String(formData.get("proxima") ?? "").trim();
  if (!negocioId || !resultado) return;

  await prisma.actividad.create({
    data: { negocioId, tipo: "contacto", descripcion: `Visita: ${resultado}` },
  });
  if (proximaStr) {
    await prisma.negocio.update({
      where: { id: negocioId },
      data: { proximaReposicion: new Date(proximaStr) },
    });
  }

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

/** Capta un cliente nuevo en terreno. */
export async function crearClienteRuta(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  if (!get("nombreNegocio")) return;

  const cliente = await prisma.negocio.create({
    data: {
      nombreNegocio: get("nombreNegocio"),
      nombreContacto: get("nombreContacto") || get("nombreNegocio"),
      whatsapp: get("whatsapp"),
      comuna: get("comuna"),
      direccion: get("direccion") || null,
      tipoNegocio: get("tipoNegocio") || null,
      tipoCliente: "prospecto",
      estado: "nuevo",
      origen: "ruta",
      actividades: { create: { tipo: "creado", descripcion: "Cliente captado en ruta" } },
    },
  });

  revalidatePath("/vendedor");
  redirect(`/vendedor/cliente/${cliente.id}`);
}
