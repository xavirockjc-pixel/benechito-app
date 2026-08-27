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

  // Sabores por línea (respaldo para trufas/cuchuflís, que sí tienen línea propia).
  const sabores = await prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true, linea: true }, orderBy: { nombre: "asc" } });
  const saboresPorLinea: Record<string, string[]> = {};
  for (const s of sabores) (saboresPorLinea[s.linea] ??= []).push(s.nombre);
  // Sabores del producto: los propios (saboresTienda) o, si no hay, los de su línea;
  // se quitan los NO disponibles hoy y se agrega "Mixto al azar" si está activo.
  const saboresDe = (prod: { saboresTienda: string | null; saboresNoDisp: string | null; permiteMixto: boolean; linea: string }) => {
    const propios = (prod.saboresTienda ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const base = propios.length > 0 ? propios : (saboresPorLinea[prod.linea] ?? []);
    const noDisp = new Set((prod.saboresNoDisp ?? "").split(",").map((x) => x.trim()).filter(Boolean));
    const disponibles = base.filter((s) => !noDisp.has(s));
    return prod.permiteMixto ? ["🎲 Mixto al azar", ...disponibles] : disponibles;
  };

  const productos = precios
    .map((p) => ({
      id: p.producto.id,
      nombre: p.producto.nombre,
      descripcion: p.producto.descripcion,
      formato: p.producto.formato,
      seccion: p.producto.seccion ?? "propio",
      fotoUrl: p.producto.fotoUrl,
      precio: Number(p.precio),
      sabores: saboresDe(p.producto),
      min: p.producto.minTienda ?? 1,
      max: p.producto.maxTienda ?? 0,
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
