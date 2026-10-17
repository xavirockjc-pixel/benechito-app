"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { mpConfigurado, crearPreferencia } from "@/lib/mercadopago";
import { notificarTelegram } from "@/lib/telegram";

type LineaCarro = { productoId: string; cantidad: number; sabor?: string };

/** Últimos 8 dígitos del teléfono, para calzar clientes sin depender del prefijo. */
function colaTelefono(v: string): string {
  return (v || "").replace(/\D/g, "").slice(-8);
}

/**
 * Crea un pedido desde la tienda pública. Los PRECIOS se recalculan en el servidor
 * (nunca se confía en lo que manda el navegador). El pedido cae en la central.
 */
export async function crearPedidoTienda(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const entrega = String(formData.get("entrega") ?? "retiro").trim(); // retiro | despacho
  const comuna = String(formData.get("comuna") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const notasCliente = String(formData.get("notas") ?? "").trim();
  // Ubicación GPS que compartió el cliente (para el despacho).
  const lat = Number(String(formData.get("lat") ?? "").trim());
  const lng = Number(String(formData.get("lng") ?? "").trim());
  const tieneUbic = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
  // Agenda: fecha + hora que eligió el cliente (opcional).
  const fechaStr = String(formData.get("fecha") ?? "").trim();
  const horaStr = String(formData.get("hora") ?? "").trim();
  const fechaAgenda = fechaStr ? new Date(`${fechaStr}T${horaStr || "12:00"}:00`) : null;
  const raw = String(formData.get("carro") ?? "[]");

  if (!nombre || !telefono) redirect("/tienda?error=datos");
  // Despacho: la ubicación es obligatoria (así siempre sabemos a dónde llevar).
  if (entrega === "despacho" && !tieneUbic) redirect("/tienda?error=ubicacion");

  let carro: LineaCarro[] = [];
  try { carro = JSON.parse(raw); } catch { carro = []; }
  carro = carro.filter((l) => l.productoId && l.cantidad > 0);
  if (carro.length === 0) redirect("/tienda?error=carro");

  // Tarifa elegida por el cliente → canal de la lista de precios.
  const TARIFA_CANAL: Record<string, string> = { detalle: "sala", online: "web", comerciante: "negocio", distribuidor: "distribuidor" };
  const tarifa = String(formData.get("tarifa") ?? "detalle").trim();
  // Distribución es un mercado privado: sus precios se entregan por correo, no se
  // pide por la tienda pública (así nadie ve esos precios ni ordena con ellos).
  if (tarifa === "distribuidor") redirect("/tienda?error=distribucion");
  const canalTarifa = TARIFA_CANAL[tarifa] ?? "web";
  const lista =
    (await prisma.listaPrecio.findFirst({ where: { canal: canalTarifa, activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { canal: "web", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { canal: "sala", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { activo: true } }));
  if (!lista) redirect("/tienda?error=config");

  // Precios reales desde la lista: TODOS los tramos (no solo el base), para aplicar
  // el precio por bolsa según la cantidad total de cada producto.
  const ids = carro.map((l) => l.productoId);
  const precios = await prisma.precioProducto.findMany({
    where: { listaId: lista.id, productoId: { in: ids }, producto: { publicarTienda: true, activo: true } },
    select: { productoId: true, precio: true, cantidadMinima: true },
  });
  // Tramos por producto, ordenados por cantidad ascendente.
  const tramosDe = new Map<string, { desde: number; precio: number }[]>();
  for (const p of precios) {
    const arr = tramosDe.get(p.productoId) ?? [];
    arr.push({ desde: p.cantidadMinima, precio: Number(p.precio) });
    tramosDe.set(p.productoId, arr);
  }
  for (const arr of tramosDe.values()) arr.sort((a, b) => a.desde - b.desde);
  // Reglas de cantidad (mín/máx) por producto — se validan en el servidor.
  const prods = await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, minTienda: true, maxTienda: true } });
  const reglaDe = new Map(prods.map((p) => [p.id, { min: Math.max(1, p.minTienda ?? 1), max: p.maxTienda ?? 0 }]));
  // Cantidad final por línea (respeta mín/máx) y total por producto para elegir el tramo.
  const lineas = carro
    .filter((l) => tramosDe.has(l.productoId))
    .map((l) => {
      const r = reglaDe.get(l.productoId) ?? { min: 1, max: 0 };
      let cant = Math.max(r.min, Math.floor(l.cantidad));
      if (r.max > 0) cant = Math.min(cant, r.max);
      return { productoId: l.productoId, cantidad: cant, sabor: (l.sabor ?? "").trim() || null };
    });
  const totalPorProd = new Map<string, number>();
  for (const l of lineas) totalPorProd.set(l.productoId, (totalPorProd.get(l.productoId) ?? 0) + l.cantidad);
  const unitPorCantidad = (productoId: string, qty: number) => {
    const tramos = tramosDe.get(productoId) ?? [];
    if (tramos.length === 0) return 0;
    let precio = tramos[0].precio;
    for (const t of tramos) if (qty >= t.desde) precio = t.precio;
    return precio;
  };
  const items = lineas.map((l) => ({
    productoId: l.productoId,
    cantidad: l.cantidad,
    precioUnit: unitPorCantidad(l.productoId, totalPorProd.get(l.productoId) ?? l.cantidad),
    sabor: l.sabor,
  }));
  if (items.length === 0) redirect("/tienda?error=carro");

  // Cliente: calza por teléfono o se crea uno nuevo (consumidor web).
  let negocioId: string | null = null;
  const cola = colaTelefono(telefono);
  if (cola.length >= 6) {
    const ex = await prisma.negocio.findFirst({ where: { whatsapp: { contains: cola } }, select: { id: true } });
    negocioId = ex?.id ?? null;
  }
  if (!negocioId) {
    const nuevo = await prisma.negocio.create({
      data: {
        nombreContacto: nombre, nombreNegocio: nombre, whatsapp: telefono, comuna: comuna || "—",
        tipoCliente: "consumidor", origen: "web", compra: null,
        estado: "nuevo",
        direccion: direccion || null,
        latitud: tieneUbic ? lat : null, longitud: tieneUbic ? lng : null,
      },
    });
    negocioId = nuevo.id;
  } else if (tieneUbic || direccion) {
    // Cliente conocido: actualiza su ubicación/dirección con lo del pedido.
    await prisma.negocio.update({
      where: { id: negocioId },
      data: { ...(tieneUbic ? { latitud: lat, longitud: lng } : {}), ...(direccion ? { direccion } : {}), ...(comuna ? { comuna } : {}) },
    }).catch(() => {});
  }

  // Clasificación: retiro → local; despacho en zona (Coronel/Lota) → delivery (moto);
  // despacho en otra comuna → reparto (se agenda aprovechando la ruta).
  const ZONAS_DELIVERY = ["coronel", "lota"];
  const esZonaDelivery = ZONAS_DELIVERY.includes(comuna.toLowerCase());
  const tipoEntrega = entrega !== "despacho" ? "retiro" : esZonaDelivery ? "delivery" : "reparto";
  const destino = entrega === "despacho" ? "reparto" : "local";
  const TARIFA_LABEL: Record<string, string> = { detalle: "Consumidor/detalle", online: "Promocional online", comerciante: "Mayorista/comerciante", distribuidor: "Distribuidor" };
  const entregaTxt = entrega !== "despacho"
    ? "Retira en local"
    : esZonaDelivery
      ? `Delivery ${comuna}${direccion ? ` · ${direccion}` : ""}`
      : `Para ruta (sin delivery en ${comuna || "su comuna"})${direccion ? ` · ${direccion}` : ""}`;
  const notas = [
    `Tarifa: ${TARIFA_LABEL[tarifa] ?? tarifa}`,
    entregaTxt,
    notasCliente ? `Nota: ${notasCliente}` : "",
  ].filter(Boolean).join(" · ");

  const pedido = await prisma.pedido.create({
    data: {
      negocioId, canal: "online", estado: "solicitud",
      tipoEntrega, destino, listaPrecioId: lista.id, notas,
      fechaAgenda: fechaAgenda && !isNaN(fechaAgenda.getTime()) ? fechaAgenda : null,
      items: { create: items },
    },
    include: { items: { include: { producto: { select: { nombre: true } } } } },
  });

  await prisma.actividad.create({
    data: { negocioId, tipo: "pedido", descripcion: `Pedido web (${tipoEntrega}) por la tienda online` },
  }).catch(() => {});

  // Aviso automático al dueño por Telegram (si está configurado el bot).
  {
    const lineasMsg = pedido.items.map((it) => `• ${it.cantidad}x ${it.producto.nombre}`).join("\n");
    const totalMsg = pedido.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
    const ubicMsg = tieneUbic ? `\n📍 Ubicación: https://www.google.com/maps?q=${lat},${lng}` : "";
    const entregaMsg = entrega === "despacho" ? `🛵 Despacho${direccion ? ` a: ${direccion}` : ""}${ubicMsg}` : "🏪 Retira en local";
    const agendaMsg = fechaAgenda && !isNaN(fechaAgenda.getTime())
      ? `\n📅 Para: ${fechaAgenda.toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })} ${fechaAgenda.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`
      : "";
    await notificarTelegram(
      `🛒 *Nuevo pedido web · Benechito*\n📋 A preparar y despachar\n\n👤 ${nombre}${telefono ? ` · ${telefono}` : ""}\n${entregaMsg}${agendaMsg}\n\n${lineasMsg}\n\n💰 Total: $${totalMsg.toLocaleString("es-CL")}\n🐝 Gestiónalo en benechito.com/admin/pedidos`,
    );
  }

  ["/admin/retiros", "/admin/pedidos", "/caja"].forEach((r) => revalidatePath(r));

  // Pago en línea con Mercado Pago (si está configurado): redirige al checkout.
  if (mpConfigurado()) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const baseUrl = process.env.APP_URL || (host ? `${proto}://${host}` : "");
    if (baseUrl) {
      const link = await crearPreferencia({
        pedidoId: pedido.id,
        baseUrl,
        nombre,
        telefono,
        items: pedido.items.map((it) => ({ title: it.producto.nombre, quantity: it.cantidad, unit_price: Number(it.precioUnit) })),
      });
      if (link) redirect(link);
    }
  }

  // Sin pago en línea (o falló): confirma el pedido y avisa que se contactará.
  redirect(`/tienda/gracias?pedido=${pedido.id}`);
}
