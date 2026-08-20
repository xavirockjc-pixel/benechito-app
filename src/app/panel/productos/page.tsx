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
      <h1 className="text-2xl font-extrabold text-navy">Catálogo de productos</h1>
      <p className="text-sm text-choco-2">
        Base del inventario. En la Fase 2 conectaremos stock y cantidades por góndola.
      </p>

      {Object.entries(porLinea).map(([linea, items]) => (
        <div key={linea} className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-navy">
            {lineaLabel[linea] ?? linea}{" "}
            <span className="text-sm font-normal text-choco-2">({items.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2">
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
