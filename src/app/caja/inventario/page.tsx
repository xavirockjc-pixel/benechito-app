import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { quitarProductoCaja } from "../actions";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", proteico: "Proteicos",
  paleta: "Paletas", cocada: "Cocadas", postre: "Postres", bebida: "Bebidas", snack: "Snacks", otro: "Otro",
};

export default async function InventarioLocal() {
  const salaUbic = (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ?? (await prisma.ubicacion.findFirst());
  const salaLista = (await prisma.listaPrecio.findFirst({ where: { canal: "sala" } })) ?? (await prisma.listaPrecio.findFirst({ where: { activo: true } }));

  const [productos, stockSala, precios] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, formato: true, linea: true, stockMinimo: true } }),
    salaUbic ? prisma.stock.findMany({ where: { ubicacionId: salaUbic.id } }) : Promise.resolve([]),
    salaLista ? prisma.precioProducto.findMany({ where: { listaId: salaLista.id, cantidadMinima: 1 } }) : Promise.resolve([]),
  ]);

  const stockDe = new Map(stockSala.map((s) => [s.productoId, s.cantidad]));
  const precioDe = new Map(precios.map((p) => [p.productoId, Number(p.precio)]));

  const porLinea = productos.reduce<Record<string, typeof productos>>((acc, p) => {
    (acc[p.linea] ??= []).push(p); return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">📋 Inventario del local</h1>
          <p className="text-sm text-slate-500">Lo que tienes en la sala. Quita lo que ya no vendes.</p>
        </div>
        <Link href="/caja/nuevo-producto" className="rounded-lg bg-[#0f7a44] px-3 py-2 text-sm font-bold text-white active:scale-95">➕ Nuevo</Link>
      </div>

      {productos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No hay productos. Agrega el primero con “➕ Nuevo”.</p>
      ) : (
        Object.entries(porLinea).map(([linea, items]) => (
          <div key={linea} className="mt-5">
            <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-500">{lineaLabel[linea] ?? linea} <span className="text-slate-400">({items.length})</span></h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {items.map((p) => {
                const stock = stockDe.get(p.id) ?? 0;
                const precio = precioDe.get(p.id);
                const bajo = p.stockMinimo > 0 && stock <= p.stockMinimo;
                return (
                  <li key={p.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 ${bajo ? "bg-red-50/60" : ""}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800">{p.nombre}{p.formato ? <span className="font-normal text-slate-400"> · {p.formato}</span> : null}</span>
                      <span className="text-xs text-slate-500">
                        stock: <b className={bajo ? "text-red-600" : "text-slate-700"}>{stock}</b>{bajo ? " ⚠ bajo" : ""}
                        {precio != null ? ` · ${fmtCLP(precio)}` : " · sin precio"}
                      </span>
                    </span>
                    <form action={quitarProductoCaja}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">🗑️ Quitar</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">“Quitar” oculta el producto de la venta (no lo borra). Se puede reactivar desde el panel de administración.</p>
    </div>
  );
}
