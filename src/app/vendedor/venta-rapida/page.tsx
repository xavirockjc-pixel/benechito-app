import Link from "next/link";
import { prisma } from "@/lib/prisma";
import VentaRapida from "./VentaRapida";

export const dynamic = "force-dynamic";

/** Elige la lista de precios para la venta directa: Reparto → Sala → primera con precios. */
async function listaVentaRapida(): Promise<{ id: string; nombre: string } | null> {
  for (const canal of ["reparto", "sala"]) {
    const l = await prisma.listaPrecio.findFirst({ where: { canal, activo: true }, select: { id: true, nombre: true } });
    if (l && (await prisma.precioProducto.count({ where: { listaId: l.id } })) > 0) return l;
  }
  // Cualquier lista que tenga precios cargados.
  const conPrecio = await prisma.precioProducto.findFirst({
    select: { lista: { select: { id: true, nombre: true } } },
  });
  return conPrecio?.lista ?? null;
}

export default async function VentaRapidaPage() {
  const lista = await listaVentaRapida();

  const precios = lista
    ? await prisma.precioProducto.findMany({
        where: { listaId: lista.id, cantidadMinima: 1 },
        include: { producto: { select: { id: true, nombre: true, formato: true, activo: true } } },
      })
    : [];

  const productos = precios
    .filter((p) => p.producto.activo)
    .map((p) => ({ id: p.producto.id, nombre: p.producto.nombre, formato: p.producto.formato, precio: Number(p.precio) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">⚡ Venta rápida</h1>
      <p className="text-xs text-slate-500">
        Venta directa a público, sin elegir cliente. {lista ? `Precios: ${lista.nombre}` : ""}
      </p>

      <div className="mt-3">
        <VentaRapida productos={productos} />
      </div>
    </div>
  );
}
