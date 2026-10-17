"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { marcarAsistenciaAuto } from "@/lib/asistencia";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";
import { estadoPagoDe, MEDIOS_PAGO, faltaParaFactura, documentoLegacy } from "@/lib/dominio/ventas";
import { crearDocumentoVenta } from "@/lib/facturacion";
import { canalPorTipoCliente } from "@/lib/dominio/canales";
import { ordenarPorCercania } from "@/lib/dominio/reparto";

// ===== Pedidos de reparto (WhatsApp → agenda → ruta) =====

/** Crea un pedido de reparto (ya parseado en el cliente). Entra al final de la ruta del día. */
export async function crearPedidoReparto(formData: FormData) {
  const pedido = String(formData.get("pedido") ?? "").trim();
  if (!pedido) return;
  const cliente = String(formData.get("cliente") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").replace(/\D/g, "") || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim() || null;
  const latN = parseFloat(String(formData.get("lat") ?? ""));
  const lngN = parseFloat(String(formData.get("lng") ?? ""));
  const lat = Number.isFinite(latN) ? latN : null;
  const lng = Number.isFinite(lngN) ? lngN : null;
  const monto = Number(String(formData.get("monto") ?? "").replace(/[^0-9]/g, "")) || 0;
  // En la captura solo ENLAZAMOS si el cliente ya existe (no creamos negocios casuales).
  let negocioId: string | null = String(formData.get("negocioId") ?? "").trim() || null;
  if (!negocioId && cliente) {
    const low = cliente.toLowerCase();
    const negs = await prisma.negocio.findMany({ select: { id: true, nombreNegocio: true, nombreContacto: true }, take: 600 });
    negocioId = negs.find((x) => x.nombreNegocio?.toLowerCase() === low || x.nombreContacto?.toLowerCase() === low)?.id ?? null;
  }
  const fechaStr = String(formData.get("fecha") ?? "").trim();
  let fecha: Date | undefined;
  if (fechaStr) { const d = new Date(fechaStr + "T08:00:00"); if (!isNaN(d.getTime())) fecha = d; }
  const u = await usuarioActual();

  const estadoPago = String(formData.get("estadoPago") ?? "") === "pagado" ? "pagado" : "por_cobrar";
  const max = await prisma.pedidoReparto.aggregate({ _max: { orden: true }, where: { estado: { in: ["pendiente", "en_ruta"] } } });
  await prisma.pedidoReparto.create({
    data: {
      cliente, telefono, pedido, direccion, mapsUrl, lat, lng, negocioId, estadoPago,
      monto: monto > 0 ? monto : null,
      ...(fecha ? { fecha } : {}),
      orden: (max._max.orden ?? 0) + 1,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/vendedor/pedidos");
  revalidatePath("/admin");
}

/** Sube o baja un pedido en la ruta (intercambia orden con el vecino). */
export async function moverPedidoReparto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;
  const lista = await prisma.pedidoReparto.findMany({ where: { estado: { in: ["pendiente", "en_ruta"] } }, orderBy: { orden: "asc" } });
  const i = lista.findIndex((p) => p.id === id);
  if (i < 0) return;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return;
  await prisma.$transaction([
    prisma.pedidoReparto.update({ where: { id: lista[i].id }, data: { orden: lista[j].orden } }),
    prisma.pedidoReparto.update({ where: { id: lista[j].id }, data: { orden: lista[i].orden } }),
  ]);
  revalidatePath("/vendedor/pedidos");
}

/** Ordena la ruta por cercanía desde un origen (GPS del vendedor o primer punto). */
export async function ordenarRutaCercania(formData: FormData) {
  const olat = parseFloat(String(formData.get("olat") ?? ""));
  const olng = parseFloat(String(formData.get("olng") ?? ""));
  const lista = await prisma.pedidoReparto.findMany({ where: { estado: { in: ["pendiente", "en_ruta"] } }, orderBy: { orden: "asc" } });
  if (lista.length === 0) return;
  const primero = lista.find((p) => p.lat != null && p.lng != null);
  const origen = Number.isFinite(olat) && Number.isFinite(olng)
    ? { lat: olat, lng: olng }
    : (primero ? { lat: primero.lat!, lng: primero.lng! } : null);
  if (!origen) return;
  const ordenados = ordenarPorCercania(lista, origen);
  await prisma.$transaction(ordenados.map((p, idx) => prisma.pedidoReparto.update({ where: { id: p.id }, data: { orden: idx + 1 } })));
  revalidatePath("/vendedor/pedidos");
}

/** Marca un pedido como entregado (sale de la ruta) y lo deja como venta (cerebro). */
export async function entregarPedidoReparto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const p = await prisma.pedidoReparto.findUnique({ where: { id } });
  if (!p) return;
  let ventaId = p.ventaId ?? null;
  // Si tiene monto y aún no es venta, créala para el análisis del cerebro.
  if (!ventaId && Number(p.monto ?? 0) > 0) {
    const negocioId = await resolverNegocio(p.cliente, p.negocioId);
    if (negocioId) {
      // Una línea con el texto del pedido (sin desglose) y el monto como total.
      const bod = await bodegaId();
      const ubic = bod ?? (await prisma.ubicacion.findFirst())?.id;
      if (ubic) {
        const venta = await prisma.venta.create({ data: { negocioId, ubicacionId: ubic, total: Number(p.monto), canal: "terreno", estadoPago: p.estadoPago === "pagado" ? "pagado" : "pendiente", etiqueta: `Reparto: ${p.pedido}`.slice(0, 180) } });
        ventaId = venta.id;
        await prisma.pedidoReparto.update({ where: { id }, data: { negocioId } }).catch(() => {});
      }
    }
  }
  await prisma.pedidoReparto.update({ where: { id }, data: { estado: "entregado", entregadoEn: new Date(), ventaId } }).catch(() => {});
  revalidatePath("/vendedor/pedidos");
  revalidatePath("/admin");
}

/** Marca pagado / por cobrar. */
export async function pagoPedidoReparto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const estadoPago = String(formData.get("estadoPago") ?? "") === "pagado" ? "pagado" : "por_cobrar";
  if (!id) return;
  await prisma.pedidoReparto.update({ where: { id }, data: { estadoPago } }).catch(() => {});
  revalidatePath("/vendedor/pedidos");
}

/** Borra un pedido de reparto. */
export async function borrarPedidoReparto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.pedidoReparto.delete({ where: { id } }).catch(() => {});
  revalidatePath("/vendedor/pedidos");
}

/** Busca un cliente por id o nombre; si no existe y hay nombre, lo crea mínimo. */
async function resolverNegocio(nombre: string | null, hintId?: string | null): Promise<string | null> {
  if (hintId) {
    const ex = await prisma.negocio.findUnique({ where: { id: hintId }, select: { id: true } });
    if (ex) return ex.id;
  }
  const n = (nombre ?? "").trim();
  if (!n) return null;
  const low = n.toLowerCase();
  const negs = await prisma.negocio.findMany({ select: { id: true, nombreNegocio: true, nombreContacto: true }, take: 600 });
  const m = negs.find((x) => x.nombreNegocio?.toLowerCase() === low || x.nombreContacto?.toLowerCase() === low);
  if (m) return m.id;
  const creado = await prisma.negocio.create({ data: { nombreNegocio: n, nombreContacto: n, whatsapp: "", comuna: "", tipoCliente: "ruta", origen: "manual", estado: "activo" } });
  return creado.id;
}

/** Normaliza para comparar nombres de producto. */
function normProd(s: string) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }

/**
 * Crea una venta de reparto desde líneas (producto, cantidad, precioUnit). Si el
 * precio viene en 0 y el producto calza, usa el precio por sector/cantidad del
 * cliente. Registra las unidades (MovimientoStock venta) para que el cerebro lo
 * analice. Devuelve el id de la venta (o null si no se pudo).
 */
async function crearVentaReparto(negocioId: string, lineasIn: { producto: string; cantidad: number; precioUnit: number }[]): Promise<string | null> {
  const { precioParaCliente } = await import("@/lib/dominio/precios");
  const bod = await bodegaId();
  const ubic = bod ?? (await prisma.ubicacion.findFirst())?.id;
  if (!ubic) return null;

  const productos = await prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
  const matchProd = (nombre: string) => {
    const nn = normProd(nombre);
    return productos.find((p) => normProd(p.nombre) === nn) ?? productos.find((p) => normProd(p.nombre).includes(nn) && nn.length > 2);
  };

  const lineas: { producto: string; cantidad: number; precioUnit: number; productoId: string | null }[] = [];
  for (const l of lineasIn) {
    if (!l.producto?.trim() || l.cantidad <= 0) continue;
    const prod = matchProd(l.producto);
    let precio = l.precioUnit;
    if (precio <= 0 && prod) {
      const p = await precioParaCliente(negocioId, prod.id, l.cantidad).catch(() => null);
      if (p) precio = Number(p);
    }
    lineas.push({ producto: l.producto.trim(), cantidad: l.cantidad, precioUnit: precio, productoId: prod?.id ?? null });
  }
  if (lineas.length === 0) return null;
  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);
  const etiqueta = ("Reparto: " + lineas.map((l) => `${l.cantidad} ${l.producto}`).join(", ")).slice(0, 180);

  const venta = await prisma.venta.create({ data: { negocioId, ubicacionId: ubic, total, canal: "terreno", estadoPago: "pendiente", etiqueta } });
  for (const l of lineas) {
    if (!l.productoId) continue;
    await aplicarDelta(l.productoId, ubic, -l.cantidad);
    await prisma.movimientoStock.create({ data: { productoId: l.productoId, tipo: "venta", ubicacionOrigenId: ubic, cantidad: l.cantidad, referencia: venta.id } });
  }
  return venta.id;
}

/** Venta especial por dictado → crea la venta (cliente/canal) y registra unidades. */
export async function registrarVentaDictada(formData: FormData) {
  let lineas: { producto: string; cantidad: number; precioUnit: number }[] = [];
  try { lineas = JSON.parse(String(formData.get("lineas") ?? "[]")); } catch { return; }
  lineas = lineas.filter((l) => l && l.producto?.trim() && Number.isFinite(l.cantidad) && l.cantidad > 0);
  if (lineas.length === 0) return;
  const cliente = String(formData.get("cliente") ?? "").trim() || null;
  const negocioId = await resolverNegocio(cliente, String(formData.get("negocioId") ?? "") || null);
  if (!negocioId) return;
  await crearVentaReparto(negocioId, lineas);
  revalidatePath("/vendedor/pedidos");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  redirect("/vendedor/pedidos?venta=1");
}

/**
 * "Sí, viene": agenda UN cliente a la ruta de un día (crea un PedidoReparto).
 * No duplica si ya está agendado ese día. Sirve para marcar las confirmaciones.
 */
export async function agendarCliente(formData: FormData) {
  const dia = String(formData.get("dia") ?? "").trim();
  const cliente = String(formData.get("cliente") ?? "").trim() || "Cliente";
  const telefono = String(formData.get("telefono") ?? "").replace(/\D/g, "") || null;
  const negocioId = String(formData.get("negocioId") ?? "").trim() || null;
  const latN = parseFloat(String(formData.get("lat") ?? ""));
  const lngN = parseFloat(String(formData.get("lng") ?? ""));
  const lat = Number.isFinite(latN) ? latN : null;
  const lng = Number.isFinite(lngN) ? lngN : null;

  const fecha = dia ? new Date(dia + "T08:00:00") : new Date();
  if (isNaN(fecha.getTime())) return;
  const d0 = new Date(fecha); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(d0.getTime() + 86400000);

  const existe = await prisma.pedidoReparto.findFirst({
    where: { fecha: { gte: d0, lt: d1 }, estado: { in: ["pendiente", "en_ruta"] }, OR: [...(negocioId ? [{ negocioId }] : []), ...(telefono ? [{ telefono }] : [])] },
    select: { id: true },
  });
  if (existe) { revalidatePath("/vendedor/sector"); return; }

  const u = await usuarioActual();
  const max = (await prisma.pedidoReparto.aggregate({ _max: { orden: true } }))._max.orden ?? 0;
  await prisma.pedidoReparto.create({
    data: { cliente, telefono, negocioId, lat, lng, pedido: "(agendado — por confirmar)", fecha, orden: max + 1, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  });
  revalidatePath("/vendedor/sector");
  revalidatePath("/vendedor/pedidos");
}

/**
 * Resuelve un pedido WEB (de la tienda) desde Agendados: "entregado" lo marca
 * entregado; "quitar" lo saca de la lista (finalizado). Sin crear ventas.
 */
export async function resolverPedidoWeb(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const accion = String(formData.get("accion") ?? "");
  if (!id) return;
  const estado = accion === "entregado" ? "entregado" : "finalizado";
  await prisma.pedido.update({ where: { id }, data: { estado } }).catch(() => {});
  revalidatePath("/vendedor/agendados");
  revalidatePath("/vendedor/entregas");
  revalidatePath("/admin/pedidos");
}

/** Quita un cliente de la ruta del día (borra ese PedidoReparto). */
export async function quitarAgendado(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.pedidoReparto.delete({ where: { id } }).catch(() => {});
  revalidatePath("/vendedor/sector");
}

/** Agrega un cliente particular (para avisos por sector). */
export async function crearClienteParticular(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  const telefono = String(formData.get("telefono") ?? "").replace(/\D/g, "") || null;
  const sector = String(formData.get("sector") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim() || null;
  const latN = parseFloat(String(formData.get("lat") ?? ""));
  const lngN = parseFloat(String(formData.get("lng") ?? ""));
  const lat = Number.isFinite(latN) ? latN : null;
  const lng = Number.isFinite(lngN) ? lngN : null;
  const fechaStr = String(formData.get("fechaEntrega") ?? "").trim();
  let fechaEntrega: Date | null = null;
  if (fechaStr) { const d = new Date(fechaStr + "T08:00:00"); if (!isNaN(d.getTime())) fechaEntrega = d; }
  await prisma.clienteParticular.create({ data: { nombre, telefono, sector, direccion, mapsUrl, lat, lng, fechaEntrega } });
  revalidatePath("/vendedor/sector");
}

/** Borra un cliente particular. */
export async function borrarClienteParticular(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.clienteParticular.delete({ where: { id } }).catch(() => {});
  revalidatePath("/vendedor/sector");
}

/**
 * Agenda EN MASA a todos los clientes de un sector para un día: crea un pedido
 * de reparto (por confirmar) por cada negocio y particular del sector, listo
 * para la ruta de ese día. No duplica si ya tiene uno agendado ese día.
 */
export async function agendarSector(formData: FormData) {
  const sector = String(formData.get("sector") ?? "").trim();
  const dia = String(formData.get("dia") ?? "").trim();
  if (!sector) return;
  const fecha = dia ? new Date(dia + "T08:00:00") : new Date();
  if (isNaN(fecha.getTime())) return;
  const d0 = new Date(fecha); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(d0.getTime() + 86400000);
  const u = await usuarioActual();

  const [negocios, particulares, yaAgendados] = await Promise.all([
    prisma.negocio.findMany({ where: { OR: [{ sector }, { comuna: sector }] }, select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, latitud: true, longitud: true } }),
    prisma.clienteParticular.findMany({ where: { activo: true, sector }, select: { id: true, nombre: true, telefono: true } }),
    prisma.pedidoReparto.findMany({ where: { fecha: { gte: d0, lt: d1 } }, select: { negocioId: true, telefono: true, cliente: true } }),
  ]);
  const negYa = new Set(yaAgendados.map((p) => p.negocioId).filter(Boolean));
  const telYa = new Set(yaAgendados.map((p) => (p.telefono ?? "").replace(/\D/g, "")).filter(Boolean));

  let max = (await prisma.pedidoReparto.aggregate({ _max: { orden: true } }))._max.orden ?? 0;
  const nuevos: { cliente: string; telefono: string | null; negocioId: string | null; lat: number | null; lng: number | null }[] = [];
  for (const n of negocios) {
    if (negYa.has(n.id)) continue;
    nuevos.push({ cliente: n.nombreNegocio || n.nombreContacto || "Cliente", telefono: (n.whatsapp || "").replace(/\D/g, "") || null, negocioId: n.id, lat: n.latitud ?? null, lng: n.longitud ?? null });
  }
  for (const p of particulares) {
    const tel = (p.telefono ?? "").replace(/\D/g, "");
    if (tel && telYa.has(tel)) continue;
    nuevos.push({ cliente: p.nombre, telefono: tel || null, negocioId: null, lat: null, lng: null });
  }
  if (nuevos.length === 0) { revalidatePath("/vendedor/sector"); redirect(`/vendedor/sector?sector=${encodeURIComponent(sector)}&dia=${dia}&ag=0`); }

  await prisma.$transaction(nuevos.map((x) => prisma.pedidoReparto.create({
    data: { cliente: x.cliente, telefono: x.telefono, negocioId: x.negocioId, lat: x.lat, lng: x.lng, pedido: "(agendado — por confirmar)", fecha, orden: ++max, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  })));
  revalidatePath("/vendedor/sector");
  revalidatePath("/vendedor/pedidos");
  redirect(`/vendedor/sector?sector=${encodeURIComponent(sector)}&dia=${dia}&ag=${nuevos.length}`);
}

const TIPOS_TRABAJO = ["flete", "arreglo", "compra", "busqueda", "mantencion", "otro"] as const;

/** Registra un "trabajo vario" del vendedor (flete, arreglo, compra, mantención…). */
export async function registrarTrabajoVario(formData: FormData) {
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!descripcion) return;
  const tipoRaw = String(formData.get("tipo") ?? "otro").trim();
  const tipo = (TIPOS_TRABAJO as readonly string[]).includes(tipoRaw) ? tipoRaw : "otro";
  const monto = Number(String(formData.get("monto") ?? "").replace(/[^0-9]/g, "")) || 0;
  const u = await usuarioActual();
  await prisma.trabajoVario.create({
    data: { tipo, descripcion, monto: monto > 0 ? monto : null, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  });
  revalidatePath("/vendedor/trabajos");
  revalidatePath("/admin");
}

/** Borra un trabajo vario (si el vendedor se equivocó). */
export async function borrarTrabajoVario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.trabajoVario.delete({ where: { id } }).catch(() => {});
  revalidatePath("/vendedor/trabajos");
}

type LineaTerreno = { productoId: string; cantidad: number; precioUnit: number };

/** Canal de la venta del vendedor: el elegido, o auto por tipo de cliente, o "ruta". */
async function canalVendedor(formData: FormData, negocioId: string): Promise<string> {
  const elegido = String(formData.get("canal") ?? "").trim();
  if (elegido) return elegido;
  const neg = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { tipoCliente: true } });
  return canalPorTipoCliente(neg?.tipoCliente) ?? "ruta";
}

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

  const esAbono = modo === "abono";
  const aCredito = modo === "credito";

  // Abono: paga una parte ahora y queda debiendo el resto (venta parcial).
  let abono = Number(String(formData.get("abono") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(abono) || abono < 0) abono = 0;
  abono = Math.min(abono, total);
  const medioAbonoRaw = String(formData.get("medioAbono") ?? "efectivo");
  const medioAbono = (MEDIOS_PAGO as readonly string[]).includes(medioAbonoRaw) && medioAbonoRaw !== "credito" ? medioAbonoRaw : "efectivo";
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) ? modo : "efectivo";

  let estadoPago: string;
  let pagos: { create: { medio: string; monto: number } } | undefined;
  if (esAbono) {
    estadoPago = estadoPagoDe(total, abono); // pendiente | parcial | pagado
    pagos = abono > 0 ? { create: { medio: medioAbono, monto: abono } } : undefined;
  } else if (aCredito) {
    estadoPago = "pendiente";
    pagos = undefined;
  } else {
    estadoPago = "pagado";
    pagos = { create: { medio, monto: total } };
  }

  // Documento tributario elegido en la venta (o el default del cliente).
  const negFac = await prisma.negocio.findUnique({
    where: { id: negocioId },
    select: { tipoDocumentoDefault: true, rut: true, razonSocial: true, giro: true },
  });
  const tipoDoc = String(formData.get("tipoDocumento") ?? "").trim() || negFac?.tipoDocumentoDefault || "boleta";
  if (tipoDoc === "factura" && faltaParaFactura(negFac ?? {}).length > 0) {
    redirect(`/vendedor/cliente/${negocioId}/vender?error=factura`);
  }

  const u = await usuarioActual();
  const canal = await canalVendedor(formData, negocioId);
  const venta = await prisma.venta.create({
    data: {
      negocioId,
      ubicacionId,
      vendedorId: u?.sub ?? null,
      total,
      estadoPago,
      documento: documentoLegacy(tipoDoc),
      canal,
      ...(pagos ? { pagos } : {}),
    },
  });

  await marcarAsistenciaAuto(u?.sub, "Venta en terreno"); // asistencia automática

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

  const descripcion = esAbono
    ? `Venta por $${total.toLocaleString("es-CL")}: abonó $${abono.toLocaleString("es-CL")}, debe $${(total - abono).toLocaleString("es-CL")}`
    : aCredito
      ? `Venta a crédito por $${total.toLocaleString("es-CL")}`
      : `Venta por $${total.toLocaleString("es-CL")} (${medio})`;
  await prisma.actividad.create({
    data: { negocioId, tipo: "venta", descripcion },
  });

  await crearDocumentoVenta({ ventaId: venta.id, negocioId, tipo: tipoDoc, total });

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
 * Venta rápida en terreno: venta directa a público. Puede ir SIN cliente (contado)
 * o, si se elige un cliente, permite pago, abono (paga una parte, queda debiendo) o
 * fiado (crédito). Se registra a nombre del vendedor y descuenta del camión.
 */
export async function ventaRapida(formData: FormData) {
  const modo = String(formData.get("modo") ?? "efectivo").trim(); // efectivo|transferencia|abono|credito
  const negocioIdSel = String(formData.get("negocioId") ?? "").trim();
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

  const u = await usuarioActual();
  const ubicacionId =
    (await miVehiculoId()) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "vehiculo" } }))?.id ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
    (await prisma.ubicacion.findFirst())?.id;
  if (!ubicacionId) return;

  const modoDeuda = modo === "abono" || modo === "credito";
  const nombreLibre = String(formData.get("nombreLibre") ?? "").trim();
  const etiqueta = String(formData.get("etiqueta") ?? "").trim() || null;

  // Cliente: registrado, o uno rápido con el nombre escrito (para poder fiar/abonar
  // aunque no esté ingresado), o mostrador (contado).
  let cliente;
  if (negocioIdSel) {
    cliente = (await prisma.negocio.findUnique({ where: { id: negocioIdSel } })) ?? (await clienteMostrador());
  } else if (modoDeuda && nombreLibre) {
    // Busca un cliente con ese nombre (no duplicar); si no existe, lo crea.
    cliente =
      (await prisma.negocio.findFirst({ where: { nombreNegocio: { equals: nombreLibre, mode: "insensitive" } } })) ??
      (await prisma.negocio.create({
        data: { nombreContacto: nombreLibre, nombreNegocio: nombreLibre, whatsapp: "", comuna: "", tipoCliente: "consumidor", estado: "punto_activo", origen: "pos" },
      }));
  } else {
    cliente = await clienteMostrador();
  }
  const clienteReal = cliente.nombreNegocio !== "Consumidor Final";

  // Documento tributario elegido (o el default del cliente registrado).
  const tipoDoc =
    String(formData.get("tipoDocumento") ?? "").trim() ||
    (cliente as { tipoDocumentoDefault?: string }).tipoDocumentoDefault ||
    "boleta";
  if (tipoDoc === "factura" && faltaParaFactura(cliente).length > 0) {
    redirect("/vendedor/venta-rapida?error=factura");
  }

  // Abono: paga una parte ahora, el resto queda de deuda.
  let abono = Number(String(formData.get("abono") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(abono) || abono < 0) abono = 0;
  abono = Math.min(abono, total);
  const medioAbonoRaw = String(formData.get("medioAbono") ?? "efectivo");
  const medioAbono = (MEDIOS_PAGO as readonly string[]).includes(medioAbonoRaw) && medioAbonoRaw !== "credito" ? medioAbonoRaw : "efectivo";

  const esAbono = modo === "abono" && clienteReal;
  const aCredito = modo === "credito" && clienteReal;
  const medio = (MEDIOS_PAGO as readonly string[]).includes(modo) && modo !== "credito" ? modo : "efectivo";

  let estadoPago: string;
  let pagos: { create: { medio: string; monto: number } } | undefined;
  if (esAbono) {
    estadoPago = estadoPagoDe(total, abono);
    pagos = abono > 0 ? { create: { medio: medioAbono, monto: abono } } : undefined;
  } else if (aCredito) {
    estadoPago = "pendiente";
    pagos = undefined;
  } else {
    estadoPago = "pagado";
    pagos = { create: { medio, monto: total } };
  }

  const canal = await canalVendedor(formData, cliente.id);
  const venta = await prisma.venta.create({
    data: {
      negocioId: cliente.id,
      ubicacionId,
      vendedorId: u?.sub ?? null,
      total,
      estadoPago,
      documento: documentoLegacy(tipoDoc),
      canal,
      etiqueta,
      ...(pagos ? { pagos } : {}),
    },
  });

  await marcarAsistenciaAuto(u?.sub, "Venta en terreno"); // asistencia automática

  if (clienteReal) {
    const desc = esAbono
      ? `Venta rápida $${total.toLocaleString("es-CL")}: abonó $${abono.toLocaleString("es-CL")}, debe $${(total - abono).toLocaleString("es-CL")}`
      : aCredito
        ? `Venta rápida a crédito por $${total.toLocaleString("es-CL")}`
        : `Venta rápida por $${total.toLocaleString("es-CL")}`;
    await prisma.actividad.create({ data: { negocioId: cliente.id, tipo: "venta", descripcion: desc } });
  }

  for (const it of items) {
    await aplicarDelta(it.productoId, ubicacionId, -it.cantidad);
    await prisma.movimientoStock.create({
      data: { productoId: it.productoId, tipo: "venta", ubicacionOrigenId: ubicacionId, cantidad: it.cantidad, referencia: venta.id },
    });
  }

  await crearDocumentoVenta({ ventaId: venta.id, negocioId: cliente.id, tipo: tipoDoc, total });

  revalidatePath("/vendedor/venta-rapida");
  redirect("/vendedor?vendido=1");
}

/**
 * Registra una DEUDA directa a la cuenta del cliente (sin vender productos):
 * saldo inicial "de antes", un cargo puntual, etc. Crea una venta pendiente por
 * el monto, que suma al saldo y luego se cobra con el flujo normal de abonos.
 */
export async function registrarDeuda(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(/[^0-9.]/g, ""));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Deuda anterior";
  const volver = String(formData.get("volver") ?? "").trim();
  if (!negocioId || !Number.isFinite(monto) || monto <= 0) return;

  const ubicacionId =
    (await miVehiculoId()) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
    (await prisma.ubicacion.findFirst())?.id;
  if (!ubicacionId) return;

  const u = await usuarioActual();
  await prisma.venta.create({
    data: {
      negocioId,
      ubicacionId,
      vendedorId: u?.sub ?? null,
      total: monto,
      estadoPago: "pendiente",
      documento: "deuda",
    },
  });
  await marcarAsistenciaAuto(u?.sub, "Venta en terreno"); // asistencia automática
  await prisma.actividad.create({
    data: { negocioId, tipo: "contacto", descripcion: `Deuda registrada: $${monto.toLocaleString("es-CL")} (${motivo})` },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  revalidatePath(`/admin/negocios/${negocioId}`);
  if (volver) redirect(volver);
}

/** Registra un abono a una venta pendiente del cliente (cobranza en terreno). */
export async function registrarCobro(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const medio = String(formData.get("medio") ?? "efectivo").trim();
  const volver = String(formData.get("volver") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(",", "."));
  if (!ventaId || !(MEDIOS_PAGO as readonly string[]).includes(medio)) return;
  if (!Number.isFinite(monto) || monto <= 0) return;

  await prisma.pago.create({ data: { ventaId, medio, monto } });
  await recalcularEstadoPago(ventaId);
  if (negocioId) {
    await prisma.actividad.create({
      data: { negocioId, tipo: "contacto", descripcion: `Cobranza: abono de $${monto.toLocaleString("es-CL")} (${medio})` },
    });
  }

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  revalidatePath(`/admin/negocios/${negocioId}`);
  redirect(volver || `/vendedor/cliente/${negocioId}`);
}

/**
 * Abono a la CUENTA del cliente (sin elegir una venta): reparte el pago entre sus
 * ventas pendientes, de la más antigua a la más nueva (FIFO). Sirve para "me pagó
 * $X de lo que debe" sin tener que ir venta por venta.
 */
export async function abonarCuenta(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const medioRaw = String(formData.get("medio") ?? "efectivo").trim();
  const medio = (MEDIOS_PAGO as readonly string[]).includes(medioRaw) && medioRaw !== "credito" ? medioRaw : "efectivo";
  const volver = String(formData.get("volver") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(/[^0-9.]/g, ""));
  if (!negocioId || !Number.isFinite(monto) || monto <= 0) return;

  const ventas = await prisma.venta.findMany({
    where: { negocioId, estadoPago: { in: ["pendiente", "parcial", "vencido"] } },
    include: { pagos: { select: { monto: true } } },
    orderBy: { fecha: "asc" },
  });

  let restante = monto;
  for (const v of ventas) {
    if (restante <= 0) break;
    const pagado = v.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = Number(v.total) - pagado;
    if (saldo <= 0) continue;
    const aplicar = Math.min(saldo, restante);
    await prisma.pago.create({ data: { ventaId: v.id, medio, monto: aplicar } });
    await recalcularEstadoPago(v.id);
    restante -= aplicar;
  }

  const aplicado = monto - restante;
  await prisma.actividad.create({
    data: {
      negocioId,
      tipo: "contacto",
      descripcion: aplicado > 0
        ? `Abono a cuenta: $${aplicado.toLocaleString("es-CL")} (${medio})${restante > 0 ? ` · sobrante $${restante.toLocaleString("es-CL")} sin deuda que cubrir` : ""}`
        : `Abono recibido: $${monto.toLocaleString("es-CL")} (${medio}) — sin deuda pendiente`,
    },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  revalidatePath(`/admin/negocios/${negocioId}`);
  redirect(volver || `/vendedor/cliente/${negocioId}`);
}

/**
 * Registra una VENTA simple por monto (sin líneas de producto): un cobro/venta
 * puntual a la cuenta del cliente. Según el modo queda pagada (con su abono) o a
 * crédito (suma al saldo). No mueve stock — para eso está la venta con productos.
 */
export async function registrarVentaSimple(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const modo = String(formData.get("modo") ?? "pagado").trim(); // pagado | credito | abono
  const concepto = String(formData.get("concepto") ?? "").trim() || "Venta";
  const volver = String(formData.get("volver") ?? "").trim();
  const total = Number(String(formData.get("monto") ?? "").trim().replace(/[^0-9.]/g, ""));
  if (!negocioId || !Number.isFinite(total) || total <= 0) return;

  const ubicacionId =
    (await miVehiculoId()) ??
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
    (await prisma.ubicacion.findFirst())?.id;
  if (!ubicacionId) return;

  const medioRaw = String(formData.get("medio") ?? "efectivo").trim();
  const medio = (MEDIOS_PAGO as readonly string[]).includes(medioRaw) && medioRaw !== "credito" ? medioRaw : "efectivo";
  let abono = Number(String(formData.get("abono") ?? "").trim().replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(abono) || abono < 0) abono = 0;
  abono = Math.min(abono, total);

  let estadoPago: string;
  let pagos: { create: { medio: string; monto: number } } | undefined;
  if (modo === "credito") {
    estadoPago = "pendiente";
    pagos = undefined;
  } else if (modo === "abono") {
    estadoPago = estadoPagoDe(total, abono);
    pagos = abono > 0 ? { create: { medio, monto: abono } } : undefined;
  } else {
    estadoPago = "pagado";
    pagos = { create: { medio, monto: total } };
  }

  const u = await usuarioActual();
  await prisma.venta.create({
    data: {
      negocioId,
      ubicacionId,
      vendedorId: u?.sub ?? null,
      total,
      estadoPago,
      documento: "boleta",
      etiqueta: concepto,
      ...(pagos ? { pagos } : {}),
    },
  });
  await marcarAsistenciaAuto(u?.sub, "Venta en terreno"); // asistencia automática
  await prisma.actividad.create({
    data: {
      negocioId,
      tipo: "venta",
      descripcion: modo === "credito"
        ? `Venta a crédito por $${total.toLocaleString("es-CL")} (${concepto})`
        : modo === "abono"
          ? `Venta $${total.toLocaleString("es-CL")}: abonó $${abono.toLocaleString("es-CL")}, debe $${(total - abono).toLocaleString("es-CL")} (${concepto})`
          : `Venta por $${total.toLocaleString("es-CL")} (${medio} · ${concepto})`,
    },
  });

  revalidatePath(`/vendedor/cliente/${negocioId}`);
  revalidatePath(`/admin/negocios/${negocioId}`);
  redirect(volver || `/vendedor/cliente/${negocioId}`);
}

/**
 * Registro de visita por voz (centralizado): en una sola pasada guarda lo que pasó
 * en la visita — nota, compra, abono, si quiere factura y próxima visita agendada.
 */
export async function registrarVisitaVoz(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  if (!negocioId) return;
  const u = await usuarioActual();
  const n = (k: string) => Number(String(formData.get(k) ?? "").replace(/[^0-9]/g, "")) || 0;

  const nota = String(formData.get("nota") ?? "").trim();
  const compra = n("compra");
  const abono = n("abono");
  const quiereFactura = String(formData.get("factura") ?? "") === "on" || String(formData.get("factura") ?? "") === "true";
  const medioRaw = String(formData.get("medio") ?? "efectivo").trim();
  const medio = (MEDIOS_PAGO as readonly string[]).includes(medioRaw) && medioRaw !== "credito" ? medioRaw : "efectivo";
  const proximaStr = String(formData.get("proxima") ?? "").trim();

  const partes: string[] = [];
  if (nota) partes.push(nota);

  // 1) Compra → venta (queda pendiente; si abonó, se aplica abajo).
  if (compra > 0) {
    const ubicacionId =
      (await miVehiculoId()) ??
      (await prisma.ubicacion.findFirst({ where: { tipo: "vehiculo" } }))?.id ??
      (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } }))?.id ??
      (await prisma.ubicacion.findFirst())?.id;
    if (ubicacionId) {
      await prisma.venta.create({
        data: { negocioId, ubicacionId, vendedorId: u?.sub ?? null, total: compra, estadoPago: "pendiente", documento: quiereFactura ? "factura" : "boleta", canal: "ruta", etiqueta: "Venta en visita" },
      });
      partes.push(`compró ${"$" + compra.toLocaleString("es-CL")}`);
    }
  }

  // 2) Abono → se aplica a las deudas más antiguas (incluye la compra recién creada).
  if (abono > 0) {
    const ventas = await prisma.venta.findMany({
      where: { negocioId, estadoPago: { in: ["pendiente", "parcial", "vencido"] } },
      include: { pagos: { select: { monto: true } } },
      orderBy: { fecha: "asc" },
    });
    let restante = abono;
    for (const v of ventas) {
      if (restante <= 0) break;
      const saldo = Number(v.total) - v.pagos.reduce((s, p) => s + Number(p.monto), 0);
      if (saldo <= 0) continue;
      const aplicar = Math.min(saldo, restante);
      await prisma.pago.create({ data: { ventaId: v.id, medio, monto: aplicar } });
      await recalcularEstadoPago(v.id);
      restante -= aplicar;
    }
    partes.push(`abonó ${"$" + abono.toLocaleString("es-CL")} (${medio})`);
  }

  // 3) Quiere factura → deja marcado al cliente.
  if (quiereFactura) {
    await prisma.negocio.update({ where: { id: negocioId }, data: { requiereFactura: true, tipoDocumentoDefault: "factura" } });
    partes.push("quiere factura");
  }

  // 4) Próxima visita → agenda + próxima reposición.
  if (proximaStr) {
    const f = new Date(proximaStr);
    if (!isNaN(f.getTime())) {
      await prisma.agenda.create({ data: { titulo: "Visita a cliente", fecha: f, tipo: "visita", negocioId, estado: "pendiente" } });
      await prisma.negocio.update({ where: { id: negocioId }, data: { proximaReposicion: f } });
      partes.push(`agendado ${f.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}`);
    }
  }

  if (partes.length) {
    await prisma.actividad.create({ data: { negocioId, tipo: "contacto", descripcion: `Visita: ${partes.join(" · ")}` } });
  }

  await marcarAsistenciaAuto(u?.sub, "Visita en terreno");
  revalidatePath(`/vendedor/cliente/${negocioId}`);
  revalidatePath(`/admin/negocios/${negocioId}`);
  redirect(`/vendedor/cliente/${negocioId}`);
}

/** El vendedor/repartidor reporta su posición GPS (para verlo en la central). */
export async function reportarUbicacion(lat: number, lng: number) {
  const u = await usuarioActual();
  if (!u) return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  await prisma.usuario.update({ where: { id: u.sub }, data: { ultimaLat: lat, ultimaLng: lng, ubicacionEn: new Date() } });
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
      rut: get("rut") || null,
      razonSocial: get("razonSocial") || null,
      giro: get("giro") || null,
      tipoDocumentoDefault: get("tipoDocumentoDefault") || "boleta",
      requiereFactura: get("tipoDocumentoDefault") === "factura",
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

/**
 * El vendedor agrega un producto al catálogo (nombre, línea, formato, tipo).
 * NO fija precios ni costos: eso lo carga la central (privacidad por rol).
 * Queda activo para que se vea de inmediato.
 */
export async function agregarProductoVendedor(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const linea = String(formData.get("linea") ?? "").trim();
  if (!nombre || !linea) return;
  const tipo = String(formData.get("tipo") ?? "") === "reventa" ? "reventa" : "propio";
  const formato = String(formData.get("formato") ?? "").trim() || null;
  await prisma.producto.create({
    data: {
      nombre, linea, formato, tipo,
      // Reventa suele vivir en distribución/local; lo propio, en fabricación.
      seccion: tipo === "reventa" ? "distribucion" : "propio",
      soloLocal: tipo === "reventa",
      activo: true,
    },
  });
  revalidatePath("/vendedor/productos");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/vendedor/productos");
}
