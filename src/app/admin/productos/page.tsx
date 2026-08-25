import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lineaLabel } from "@/lib/dominio/produccion";

export const dynamic = "force-dynamic";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ linea?: string; formato?: string }>;
}) {
  const { linea, formato } = await searchParams;

  const productos = await prisma.producto.findMany({ orderBy: [{ linea: "asc" }, { nombre: "asc" }] });

  // Tipos (líneas) y formatos disponibles para los selectores.
  const lineas = [...new Set(productos.map((p) => p.linea))].sort();
  const formatos = [...new Set(productos.filter((p) => (linea ? p.linea === linea : true)).map((p) => p.formato).filter(Boolean) as string[])].sort();

  const filtrados = productos.filter((p) => (linea ? p.linea === linea : true) && (formato ? p.formato === formato : true));
  const hayFiltro = Boolean(linea || formato);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Catálogo</h1>
          <p className="text-sm text-slate-500">Elige el <b>tipo</b> y el <b>formato</b> para ver los productos. Precios en <Link href="/admin/precios" className="font-semibold text-[#1479c4]">Precios</Link>.</p>
        </div>
        <Link href="/admin/productos/nuevo" className="rounded-full bg-[#1479c4] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">+ Nuevo producto</Link>
      </div>

      {/* Selección por tipo y formato */}
      <form action="/admin/productos" className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-600">Tipo de producto
          <select name="linea" defaultValue={linea ?? ""} className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">— todos —</option>
            {lineas.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Formato
          <select name="formato" defaultValue={formato ?? ""} className="mt-1 block w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">— todos —</option>
            {formatos.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Ver productos</button>
        {hayFiltro && <Link href="/admin/productos" className="text-xs font-semibold text-slate-500">limpiar</Link>}
      </form>

      {/* Resultados */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-900">{p.nombre}</p>
              {!p.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactivo</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {lineaLabel[p.linea] ?? p.linea}{p.formato ? ` · ${p.formato}` : ""}{p.soloLocal ? " · solo local" : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <Link href={`/admin/productos/${p.id}`} className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-700 active:bg-slate-200">✎ Editar</Link>
              {p.fotoUrl ? (
                <a href={p.fotoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-[#1479c4] py-2 text-center text-xs font-bold text-white active:brightness-110">👁️ Ver</a>
              ) : (
                <span className="flex-1 rounded-lg bg-slate-50 py-2 text-center text-xs font-semibold text-slate-300">sin foto</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {productos.length === 0 ? "Aún no hay productos. Crea el primero." : "Sin productos para esa selección."}
        </p>
      )}
      <p className="mt-3 text-sm text-slate-500">{filtrados.length} producto(s){hayFiltro ? " en la selección" : ""}</p>
    </div>
  );
}
