import { prisma } from "@/lib/prisma";
import { seccionCatalogoLabel, seccionCatalogoIcono } from "@/lib/dominio/catalogo";
import Tienda from "./Tienda";

export const dynamic = "force-dynamic";

/** Lista de precios pública de la tienda: canal "web", si no "sala", si no la primera. */
async function listaTienda() {
  return (
    (await prisma.listaPrecio.findFirst({ where: { canal: "web", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { canal: "sala", activo: true } })) ??
    (await prisma.listaPrecio.findFirst({ where: { activo: true } }))
  );
}

export default async function TiendaPage() {
  const empresa = await prisma.empresa.findFirst();
  const lista = await listaTienda();

  const precios = lista
    ? await prisma.precioProducto.findMany({
        where: { listaId: lista.id, cantidadMinima: 1, producto: { publicarTienda: true, activo: true } },
        include: { producto: true },
      })
    : [];

  const productos = precios
    .map((p) => ({
      id: p.producto.id,
      nombre: p.producto.nombre,
      descripcion: p.producto.descripcion,
      formato: p.producto.formato,
      seccion: p.producto.seccion ?? "propio",
      fotoUrl: p.producto.fotoUrl,
      precio: Number(p.precio),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const secciones = [...new Set(productos.map((p) => p.seccion))].map((s) => ({
    codigo: s, label: seccionCatalogoLabel[s] ?? s, icono: seccionCatalogoIcono[s] ?? "🛍️",
  }));

  return (
    <Tienda
      negocio={empresa?.nombre ?? "Tienda"}
      productos={productos}
      secciones={secciones}
      sinConfig={!lista || productos.length === 0}
    />
  );
}
