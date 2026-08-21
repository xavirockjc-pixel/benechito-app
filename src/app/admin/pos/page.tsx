import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Caja from "./Caja";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // POS de mostrador: usa la lista "Sala de Ventas".
  const lista = await prisma.listaPrecio.findFirst({ where: { canal: "sala" } });

  const precios = lista
    ? await prisma.precioProducto.findMany({
        where: { listaId: lista.id, cantidadMinima: 1 },
        include: { producto: { select: { id: true, nombre: true, formato: true, activo: true } } },
      })
    : [];

  const productos = precios
    .filter((p) => p.producto.activo)
    .map((p) => ({
      id: p.producto.id,
      nombre: p.producto.nombre,
      formato: p.producto.formato,
      precio: Number(p.precio),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Punto de venta</h1>
          <p className="text-sm text-slate-500">
            Venta rápida de mostrador. Descuenta stock de la sala y registra el pago al instante.
          </p>
        </div>
        <Link
          href="/admin/precios"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
        >
          Precios
        </Link>
      </div>

      <div className="mt-6">
        <Caja productos={productos} />
      </div>
    </div>
  );
}
