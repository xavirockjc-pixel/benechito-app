import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas",
  cuchufli: "Cuchuflís",
  helado: "Helados",
  proteico: "Proteicos",
};

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({
    orderBy: [{ linea: "asc" }, { nombre: "asc" }],
  });

  const porLinea = productos.reduce<Record<string, typeof productos>>((acc, p) => {
    (acc[p.linea] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Catálogo de productos</h1>
          <p className="text-sm text-choco-2">
            Producto único. Los precios se gestionan por lista en{" "}
            <Link href="/admin/precios" className="font-semibold text-naranja">
              Precios
            </Link>
            .
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-full bg-naranja px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-naranja-2"
        >
          + Nuevo producto
        </Link>
      </div>

      {Object.entries(porLinea).map(([linea, items]) => (
        <div key={linea} className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-navy">
            {lineaLabel[linea] ?? linea}{" "}
            <span className="text-sm font-normal text-choco-2">({items.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/admin/productos/${p.id}`}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2 transition hover:ring-naranja"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-navy">{p.nombre}</p>
                  {!p.activo && (
                    <span className="rounded-full bg-crema-2 px-2 py-0.5 text-xs text-choco-2">
                      inactivo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-choco-2">
                  {p.formato ?? "—"}
                  {p.base ? ` · base ${p.base}` : ""}
                </p>
                {p.sku && <p className="mt-1 text-[11px] text-choco-2/70">{p.sku}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
