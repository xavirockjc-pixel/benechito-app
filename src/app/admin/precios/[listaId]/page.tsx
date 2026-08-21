import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canalLabel } from "@/lib/dominio/precios";
import { guardarPrecios } from "../actions";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas",
  cuchufli: "Cuchuflís",
  helado: "Helados",
  proteico: "Proteicos",
};

export default async function EditarListaPage({
  params,
}: {
  params: Promise<{ listaId: string }>;
}) {
  const { listaId } = await params;

  const lista = await prisma.listaPrecio.findUnique({ where: { id: listaId } });
  if (!lista) notFound();

  const [productos, precios] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ linea: "asc" }, { nombre: "asc" }],
    }),
    prisma.precioProducto.findMany({ where: { listaId, cantidadMinima: 1 } }),
  ]);

  // productoId -> precio base actual
  const precioDe = new Map(precios.map((p) => [p.productoId, p.precio.toString()]));

  const porLinea = productos.reduce<Record<string, typeof productos>>((acc, p) => {
    (acc[p.linea] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <Link href="/admin/precios" className="text-sm font-semibold text-naranja">
        ← Listas de precios
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">{lista.nombre}</h1>
      <p className="mt-1 text-sm text-choco-2">
        Canal: {canalLabel[lista.canal] ?? lista.canal}. Deja en blanco (o 0) un producto para que
        <strong> no esté disponible</strong> en esta lista.
      </p>

      <form action={guardarPrecios} className="mt-6">
        <input type="hidden" name="listaId" value={lista.id} />

        {Object.entries(porLinea).map(([linea, items]) => (
          <div key={linea} className="mt-6">
            <h2 className="mb-3 text-lg font-bold text-navy">
              {lineaLabel[linea] ?? linea}{" "}
              <span className="text-sm font-normal text-choco-2">({items.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold text-navy">
                      {p.nombre}
                    </span>
                    <span className="block text-xs text-choco-2">{p.formato ?? "—"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-sm text-choco-2">$</span>
                    <input
                      type="number"
                      name={`precio_${p.id}`}
                      defaultValue={precioDe.get(p.id) ?? ""}
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="—"
                      className="w-24 rounded-lg border border-crema-2 px-2 py-1.5 text-right text-sm font-semibold text-navy focus:border-naranja focus:outline-none"
                    />
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="sticky bottom-0 mt-8 flex justify-end border-t border-crema-2 bg-crema py-4">
          <button className="rounded-xl bg-naranja px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
            Guardar precios
          </button>
        </div>
      </form>
    </div>
  );
}
