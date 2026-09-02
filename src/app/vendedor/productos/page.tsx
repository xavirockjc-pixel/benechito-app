import { prisma } from "@/lib/prisma";
import { agregarProductoVendedor } from "../actions";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", proteico: "Proteicos",
  paleta: "Paletas", cocada: "Cocadas", postre: "Postres", otro: "Otro",
};
const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1479c4]";

export default async function ProductosVendedor() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: [{ linea: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, linea: true, formato: true, tipo: true },
  });

  // Líneas para el selector: las que ya existen + básicas.
  const lineasExistentes = [...new Set(productos.map((p) => p.linea))];
  const lineas = [...new Set([...lineasExistentes, "trufa", "cuchufli", "helado", "paleta", "cocada", "postre", "otro"])];

  const porLinea = productos.reduce<Record<string, typeof productos>>((acc, p) => {
    (acc[p.linea] ??= []).push(p); return acc;
  }, {});

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-extrabold text-slate-900">🍫 Productos</h1>
      <p className="text-sm text-slate-500">El catálogo que puedes vender. Agrega uno nuevo si falta.</p>

      {/* Agregar producto */}
      <form action={agregarProductoVendedor} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Agregar producto</p>
        <label className="mt-2 block text-xs font-bold text-slate-600">Nombre
          <input name="nombre" required placeholder="Ej: Cuchuflí bañado" className={inputCls} />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">Línea
            <select name="linea" required defaultValue="" className={inputCls}>
              <option value="">Elige…</option>
              {lineas.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Formato
            <input name="formato" placeholder="Ej: pack 5" className={inputCls} />
          </label>
          <label className="text-xs font-bold text-slate-600">Tipo
            <select name="tipo" defaultValue="propio" className={inputCls}>
              <option value="propio">Propio (fabricado)</option>
              <option value="reventa">Reventa (comprado)</option>
            </select>
          </label>
        </div>
        <button className="mt-3 w-full rounded-lg bg-[#0f766e] py-2.5 text-sm font-extrabold text-white active:scale-95">+ Agregar producto</button>
        <p className="mt-1 text-[11px] text-slate-400">El precio lo pone la central. Tú solo lo agregas al catálogo.</p>
      </form>

      {/* Catálogo */}
      {Object.entries(porLinea).map(([linea, items]) => (
        <div key={linea} className="mt-5">
          <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-500">{lineaLabel[linea] ?? linea} <span className="text-slate-400">({items.length})</span></h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{p.nombre}</span>
                <span className="shrink-0 text-xs text-slate-400">{p.formato ?? ""}{p.tipo === "reventa" ? " · reventa" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {productos.length === 0 && <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay productos. Agrega el primero arriba.</p>}
    </div>
  );
}
