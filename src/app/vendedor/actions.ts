"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";
import { estadoPagoDe, MEDIOS_PAGO } from "@/lib/dominio/ventas";

type LineaTerreno = { productoId: string; cantidad: number; precioUnit: number };

/** Cierra la sesión del vendedor. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

/** Ubicación (vehículo) asignada al vendedor logueado, o null. */
async function miVehiculoId(): Promise<string | null> {
  const u = await usuarioActual();
  if (!u) return null;
  const usuario = await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } });
  return usuario?.vehiculoId ?? null;
}

/** La bodega principal (primera ubicación tipo bodega). */
async function bodegaId(): Promise<string | null> {
  const b = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  return b?.id ?? null;
}

/** Aplica una variación de stock a una ubicación (upsert). */
async function aplicarDelta(productoId: string, ubicacionId: string, delta: number) {
  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    update: { cantidad: { increment: delta } },
    create: { productoId, ubicacionId, cantidad: delta },
  });
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
 * Venta en terreno: crea la venta al cliente con los precios de su lista y DESCUENTA
 * del stock del camión del vendedor (registra el movimiento). Según el modo de pago
 * queda pagada (efectivo/transferencia) o a crédito (pendiente → cuenta corriente).
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

  // Ubicación de la venta = camión del vendedor (o el primer vehículo / sala como respaldo).
  const ubicacionId =
    (await miVehiculoId()) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "vehiculo" } }))?.id ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
    (await prisma.ubicacion.findFirst())?.id;
  if (!ubicacionId) return;

  const aCredito = modo === "credito";
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) ? modo : "efectivo";

  const venta = await prisma.venta.create({
    data: {
      negocioId,
      ubicacionId,
      total,
      estadoPago: aCredito ? "pendiente" : "pagado",
      documento: "boleta",
      ...(aCredito ? {} : { pagos: { create: { medio, monto: total } } }),
    },
  });

  // Descuenta del camión y registra el movimiento por cada línea.
  for (const it of items) {
    await aplicarDelta(it.productoId, ubicacionId, -it.cantidad);
    await prisma.movimientoStock.create({
      data: {
        productoId: it.productoId,
        tipo: "venta",
        ubicacionOrigenId: ubicacionId,
        cantidad: it.cantidad,
        referencia: venta.id,
      },
    });
  }

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

/** Cliente genérico de mostrador (walk-in) para ventas sin cliente. Compartido con la caja. */
async function clienteMostrador() {
  let c = await prisma.negocio.findFirst({ where: { nombreNegocio: "Consumidor Final" } });
  if (!c) {
    c = await prisma.negocio.create({
      data: { nombreContacto: "Consumidor Final", nombreNegocio: "Consumidor Final", whatsapp: "", comuna: "", tipoCliente: "consumidor", estado: "punto_activo", origen: "pos" },
    });
  }
  return c;
}

/**
 * Venta rápida en terreno: venta directa a público, SIN elegir un cliente y sin
 * depender de la ruta. Queda pagada (efectivo/transferencia), se registra a nombre
 * del vendedor y descuenta del stock de su camión (igual que la venta a cliente).
 */
export async function ventaRapida(formData: FormData) {
  const modo = String(formData.get("modo") ?? "efectivo").trim(); // efectivo|transferencia
  const raw = String(formData.get("items") ?? "[]");

  let items: LineaTerreno[] = [];
  try {
    items = JSON.parse(raw);
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0 && i.precioUnit >= 0);
  if (items.length === 0) return;

  const total = items.reduce((s, i) => s + i.precioUnit * i.cantidad, 0);
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) && modo !== "credito" ? modo : "efectivo";

  const u = await usuarioActual();
  const ubicacionId =
    (await miVehiculoId()) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "vehiculo" } }))?.id ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
    (await prisma.ubicacion.findFirst())?.id;
  if (!ubicacionId) return;

  const cliente = await clienteMostrador();

  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId,
      vendedorId: u?.sub ?? null,
      total,
      estadoPago: "pagado",
      documento: "boleta",
      pagos: { create: { medio, monto: total } },
    },
  });

  for (const it of items) {
    await aplicarDelta(it.productoId, ubicacionId, -it.cantidad);
    await prisma.movimientoStock.create({
      data: { productoId: it.productoId, tipo: "venta", ubicacionOrigenId: ubicacionId, cantidad: it.cantidad, referencia: venta.id },
    });
  }

  revalidatePath("/vendedor/venta-rapida");
  redirect("/vendedor?vendido=1");
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

/** Parsea una coordenada del formulario (o null si no es válida). */
function coord(fd: FormData, k: string): number | null {
  const n = Number(String(fd.get(k) ?? "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Capta un cliente nuevo en terreno (con su ubicación GPS si se capturó). */
export async function crearClienteRuta(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  if (!get("nombreNegocio")) return;

  const latitud = coord(formData, "latitud");
  const longitud = coord(formData, "longitud");

  const cliente = await prisma.negocio.create({
    data: {
      nombreNegocio: get("nombreNegocio"),
      nombreContacto: get("nombreContacto") || get("nombreNegocio"),
      whatsapp: get("whatsapp"),
      comuna: get("comuna"),
      direccion: get("direccion") || null,
      tipoNegocio: get("tipoNegocio") || null,
      latitud,
      longitud,
      tipoCliente: "prospecto",
      estado: "nuevo",
      origen: "ruta",
      actividades: {
        create: {
          tipo: "creado",
          descripcion: latitud ? "Cliente captado en ruta (con ubicación GPS)" : "Cliente captado en ruta",
        },
      },
    },
  });

  revalidatePath("/vendedor");
  redirect(`/vendedor/cliente/${cliente.id}`);
}

/** Fija/actualiza la ubicación GPS de un cliente existente (estando parado en el local). */
export async function guardarUbicacionCliente(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const latitud = coord(formData, "latitud");
  const longitud = coord(formData, "longitud");
  if (!negocioId || latitud === null || longitud === null) return;

  await prisma.negocio.update({ where: { id: negocioId }, data: { latitud, longitud } });
  await prisma.actividad.create({
    data: { negocioId, tipo: "contacto", descripcion: "Ubicación GPS actualizada en terreno" },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

// ===========================================================================
//  Camión del vendedor (carga / venta / devolución)
// ===========================================================================

/** Asigna el vehículo con el que trabaja el vendedor. */
export async function asignarVehiculo(formData: FormData) {
  const vehiculoId = String(formData.get("vehiculoId") ?? "").trim() || null;
  const u = await usuarioActual();
  if (!u) return;
  await prisma.usuario.update({ where: { id: u.sub }, data: { vehiculoId } });
  revalidatePath("/vendedor/camion");
}

// --- Caja de reposición: stock POR SABOR en el camión del vendedor ---
async function aplicarDeltaSabor(saborId: string, ubicacionId: string, delta: number) {
  await prisma.stockSabor.upsert({
    where: { saborId_ubicacionId: { saborId, ubicacionId } },
    update: { cantidad: { increment: delta } },
    create: { saborId, ubicacionId, cantidad: delta },
  });
}

/** Carga sabores a la caja de reposición: bodega → mi camión (por sabor). */
export async function cargarSabor(formData: FormData) {
  const saborId = String(formData.get("saborId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());
  if (!saborId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const vehId = await miVehiculoId();
  const bod = await bodegaId();
  if (!vehId || !bod) return;

  await aplicarDeltaSabor(saborId, bod, -cantidad);
  await aplicarDeltaSabor(saborId, vehId, cantidad);

  revalidatePath("/vendedor/camion");
}

/**
 * Reposición POR SABOR de un Punto: el vendedor cuenta cuántas de cada sabor dejó.
 * Descuenta de su caja (StockSabor del camión) y deja el registro de la reposición.
 */
export async function reponerPunto(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  if (!negocioId) return;

  const vehId = await miVehiculoId();
  if (!vehId) return;

  const sabores = await prisma.sabor.findMany({ where: { activo: true }, select: { id: true } });
  const items: { saborId: string; cantidad: number }[] = [];
  for (const s of sabores) {
    const c = Number(String(formData.get(`sabor_${s.id}`) ?? "").trim());
    if (Number.isFinite(c) && c > 0) items.push({ saborId: s.id, cantidad: c });
  }
  if (items.length === 0) return;

  // Descuenta de la caja (camión) por sabor.
  for (const it of items) await aplicarDeltaSabor(it.saborId, vehId, -it.cantidad);

  const total = items.reduce((s, i) => s + i.cantidad, 0);
  await prisma.reposicion.create({
    data: {
      negocioId,
      notas: `Reposición por sabor: ${total} u.`,
      items: { create: items.map((i) => ({ saborId: i.saborId, cantidad: i.cantidad })) },
    },
  });
  await prisma.negocio.update({ where: { id: negocioId }, data: { ultimaReposicion: new Date() } });
  await prisma.actividad.create({
    data: { negocioId, tipo: "reposicion", descripcion: `Reposición por sabor: ${total} unidades` },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

/** Carga producto al camión: transferencia bodega → mi vehículo. */
export async function cargarVehiculo(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());
  if (!productoId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const vehId = await miVehiculoId();
  const bod = await bodegaId();
  if (!vehId || !bod) return;

  await aplicarDelta(productoId, bod, -cantidad);
  await aplicarDelta(productoId, vehId, cantidad);
  await prisma.movimientoStock.create({
    data: { productoId, tipo: "transferencia", ubicacionOrigenId: bod, ubicacionDestinoId: vehId, cantidad },
  });

  revalidatePath("/vendedor/camion");
}

/** Carga VARIOS productos al camión de una vez (usado por el modo voz). */
export async function cargarVehiculoLote(formData: FormData) {
  let items: { productoId: string; cantidad: number }[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.productoId && i.cantidad > 0);
  if (items.length === 0) return;

  const vehId = await miVehiculoId();
  const bod = await bodegaId();
  if (!vehId || !bod) return;

  for (const it of items) {
    await aplicarDelta(it.productoId, bod, -it.cantidad);
    await aplicarDelta(it.productoId, vehId, it.cantidad);
    await prisma.movimientoStock.create({
      data: { productoId: it.productoId, tipo: "transferencia", ubicacionOrigenId: bod, ubicacionDestinoId: vehId, cantidad: it.cantidad },
    });
  }

  revalidatePath("/vendedor/camion");
}

/**
 * Devuelve a bodega TODO lo que quedó en el camión (lo que no se vendió).
 * Se suma automáticamente al stock de bodega y el camión queda en cero.
 */
export async function devolverTodoABodega() {
  const vehId = await miVehiculoId();
  const bod = await bodegaId();
  if (!vehId || !bod) return;

  const enCamion = await prisma.stock.findMany({ where: { ubicacionId: vehId, cantidad: { gt: 0 } } });
  for (const s of enCamion) {
    await aplicarDelta(s.productoId, bod, s.cantidad);
    await aplicarDelta(s.productoId, vehId, -s.cantidad);
    await prisma.movimientoStock.create({
      data: {
        productoId: s.productoId,
        tipo: "transferencia",
        ubicacionOrigenId: vehId,
        ubicacionDestinoId: bod,
        cantidad: s.cantidad,
        referencia: "devolucion-ruta",
      },
    });
  }

  revalidatePath("/vendedor/camion");
}
