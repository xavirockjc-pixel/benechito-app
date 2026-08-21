import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canalLabel } from "@/lib/dominio/precios";

export const dynamic = "force-dynamic";

export default async function PreciosPage() {
  const [listas, totalProductos] = await Promise.all([
    prisma.listaPrecio.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { precios: true } } },
    }),
    prisma.producto.count({ where: { activo: true } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Listas de precios</h1>
          <p className="mt-1 max-w-2xl text-sm text-choco-2">
            Un producto <strong>único</strong>, muchos precios. Cada canal/tipo de cliente tiene su lista;
            el sistema aplica el precio correcto automáticamente.
          </p>
        </div>
        <Link
          href="/admin/precios/nueva"
          className="rounded-full bg-naranja px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-naranja-2"
        >
          + Nueva lista
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listas.map((l) => {
          const configurados = l._count.precios;
          const faltan = totalProductos - configurados;
          return (
            <Link
              key={l.id}
              href={`/admin/precios/${l.id}`}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2 transition hover:ring-naranja"
            >
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-navy">{l.nombre}</p>
                {!l.activo && (
                  <span className="rounded-full bg-crema-2 px-2 py-0.5 text-xs text-choco-2">
                    inactiva
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-choco-2">Canal: {canalLabel[l.canal] ?? l.canal}</p>
              <p className="mt-3 text-sm font-semibold text-navy">
                {configurados}/{totalProductos} productos con precio
              </p>
              {faltan > 0 ? (
                <p className="text-xs text-naranja">Faltan {faltan} por definir</p>
              ) : (
                <p className="text-xs text-green-600">Completa ✓</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
