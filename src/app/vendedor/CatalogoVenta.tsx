import { prisma } from "@/lib/prisma";
import VentaRapida from "./venta-rapida/VentaRapida";

/** Elige la lista de precios: Reparto → Sala → primera con precios. */
async function listaVenta(): Promise<{ id: string; nombre: string } | null> {
  for (const canal of ["reparto", "sala"]) {
    const l = await prisma.listaPrecio.findFirst({ where: { canal, activo: true }, select: { id: true, nombre: true } });
    if (l && (await prisma.precioProducto.count({ where: { listaId: l.id } })) > 0) return l;
  }
  const conPrecio = await prisma.precioProducto.findFirst({ select: { lista: { select: { id: true, nombre: true } } } });
  return conPrecio?.lista ?? null;
}

/** Catálogo con fotos + venta por voz (cliente nuevo/existente, boleta/factura, debe o no). */
export default async function CatalogoVenta() {
  const lista = await listaVenta();

  const precios = lista
    ? await prisma.precioProducto.findMany({
        where: { listaId: lista.id, cantidadMinima: 1 },
        include: { producto: { select: { id: true, nombre: true, formato: true, fotoUrl: true, activo: true, soloLocal: true } } },
      })
    : [];

  const productos = precios
    .filter((p) => p.producto.activo && !p.producto.soloLocal)
    .map((p) => ({ id: p.producto.id, nombre: p.producto.nombre, formato: p.producto.formato, fotoUrl: p.producto.fotoUrl, precio: Number(p.precio) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const clientes = (
    await prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" } },
      orderBy: { nombreNegocio: "asc" },
      select: { id: true, nombreNegocio: true, comuna: true },
    })
  ).map((c) => ({ id: c.id, nombreNegocio: c.nombreNegocio, comuna: c.comuna ?? "" }));

  return <VentaRapida productos={productos} clientes={clientes} />;
}
