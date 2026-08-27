"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { mpConfigurado, crearPreferencia } from "@/lib/mercadopago";

type LineaCarro = { productoId: string; cantidad: number };

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
  const direccion = String(formData.get("direccion") ?? "").trim();
  const notasCliente = String(formData.get("notas") ?? "").trim();
  const raw = String(formData.get("carro") ?? "[]");

  if (!nombre || !telefono) redirect("/tienda?error=datos");

  let carro: LineaCarro[] = [];
  try { carro = JSON.parse(raw); } catch { carro = []; }
  carro = carro.filter((l) => l.productoId && l.cantidad > 0);
  if (carro.length === 0) redirect("/tienda?error=carro");

  // Lista pública (misma lógica que la página).
  const lista =
    (await prisma.listaPrecio.findFirst({ where: { canal: "web", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { canal: "sala", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { activo: true } }));
  if (!lista) redirect("/tienda?error=config");

  // Precios reales desde la lista (solo productos publicados y activos).
  const ids = carro.map((l) => l.productoId);
  const precios = await prisma.precioProducto.findMany({
    where: { listaId: lista.id, cantidadMinima: 1, productoId: { in: ids }, producto: { publicarTienda: true, activo: true } },
    select: { productoId: true, precio: true },
  });
  const precioDe = new Map(precios.map((p) => [p.productoId, Number(p.precio)]));
  const items = carro
    .filter((l) => precioDe.has(l.productoId))
    .map((l) => ({ productoId: l.productoId, cantidad: Math.max(1, Math.floor(l.cantidad)), precioUnit: precioDe.get(l.productoId)! }));
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
        nombreContacto: nombre, nombreNegocio: nombre, whatsapp: telefono, comuna: "—",
        tipoCliente: "consumidor", origen: "web", compra: null,
        estado: "nuevo",
      },
    });
    negocioId = nuevo.id;
  }

  const tipoEntrega = entrega === "despacho" ? "delivery" : "retiro";
  const destino = entrega === "despacho" ? "reparto" : "local";
  const notas = [
    entrega === "despacho" && direccion ? `Despacho a: ${direccion}` : "Retira en local",
    notasCliente ? `Nota: ${notasCliente}` : "",
  ].filter(Boolean).join(" · ");

  const pedido = await prisma.pedido.create({
    data: {
      negocioId, canal: "online", estado: "solicitud",
      tipoEntrega, destino, listaPrecioId: lista.id, notas,
      items: { create: items },
    },
    include: { items: { include: { producto: { select: { nombre: true } } } } },
  });

  await prisma.actividad.create({
    data: { negocioId, tipo: "pedido", descripcion: `Pedido web (${tipoEntrega}) por la tienda online` },
  }).catch(() => {});

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
