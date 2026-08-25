import Link from "next/link";
import type { Producto, Ubicacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { fmtCant, unidadLabel, stockBajo } from "@/lib/dominio/materias";
import { TIPOS_MOVIMIENTO, tipoMovimientoLabel } from "@/lib/dominio/inventario";
import { registrarMovimiento } from "./actions";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500";
const TABS = [
  { k: "productos", label: "🍫 Productos" },
  { k: "insumos", label: "🧪 Insumos" },
  { k: "materiales", label: "📦 Materiales" },
];

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const tab = ["productos", "insumos", "materiales"].includes(t ?? "") ? t! : "productos";

  const [productos, ubicaciones, stock, materias] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.ubicacion.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.stock.findMany(),
    prisma.materiaPrima.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
  ]);

  const cant = new Map(stock.map((s) => [`${s.productoId}:${s.ubicacionId}`, s.cantidad]));

  // Valor invertido (stock × costo) por sección.
  const valorProductos = productos.reduce((acc, p) => {
    const total = stock.filter((s) => s.productoId === p.id).reduce((a, s) => a + s.cantidad, 0);
    return acc + (p.costo != null ? total * Number(p.costo) : 0);
  }, 0);
  const insumos = materias.filter((m) => m.categoria === "insumo");
  const materiales = materias.filter((m) => m.categoria === "material");
  const valorDe = (arr: typeof materias) => arr.reduce((a, m) => a + (m.costo != null ? m.stock * Number(m.costo) : 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">Stock por tipo, con el dinero invertido en cada uno.</p>
        </div>
        <Link href="/admin/inventario/ubicaciones" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">Ubicaciones</Link>
      </div>

      {/* Valor invertido por sección */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <ValorCard label="🍫 Productos" valor={valorProductos} />
        <ValorCard label="🧪 Insumos" valor={valorDe(insumos)} />
        <ValorCard label="📦 Materiales" valor={valorDe(materiales)} />
      </div>

      {/* Pestañas */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((x) => (
          <Link key={x.k} href={`/admin/inventario?t=${x.k}`} className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${tab === x.k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200"}`}>
            {x.label}
          </Link>
        ))}
      </div>

      {tab === "productos" && (
        <div className="mt-4">
          {ubicaciones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No hay ubicaciones. Créalas en Ubicaciones.</p>
          ) : (
            <>
              <TablaStock titulo="🏭 Fábrica y producción" productos={productos.filter((p) => !p.soloLocal)} ubicaciones={ubicaciones} cant={cant} />
              <TablaStock titulo="🛒 Solo local (Sala de Ventas)" productos={productos.filter((p) => p.soloLocal)} ubicaciones={ubicaciones} cant={cant} vacio="No hay productos exclusivos del local." />
            </>
          )}

          {/* Registrar movimiento (productos) */}
          {ubicaciones.length > 0 && productos.length > 0 && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-slate-900">Registrar movimiento</h2>
              <form action={registrarMovimiento} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-bold text-slate-700">Tipo
                  <select name="tipo" required defaultValue="ingreso" className={`mt-1 ${inputCls}`}>
                    {TIPOS_MOVIMIENTO.map((x) => <option key={x} value={x}>{tipoMovimientoLabel[x]}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">Producto
                  <select name="productoId" required defaultValue="" className={`mt-1 ${inputCls}`}>
                    <option value="">Selecciona…</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">Cantidad
                  <input type="number" name="cantidad" min="0" step="1" defaultValue="1" inputMode="numeric" className={`mt-1 ${inputCls}`} />
                </label>
                <label className="text-sm font-bold text-slate-700">Origen
                  <select name="ubicacionOrigenId" defaultValue="" className={`mt-1 ${inputCls}`}>
                    <option value="">—</option>
                    {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">Destino
                  <select name="ubicacionDestinoId" defaultValue="" className={`mt-1 ${inputCls}`}>
                    <option value="">—</option>
                    {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </label>
                <div className="flex items-end">
                  <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Registrar</button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}

      {(tab === "insumos" || tab === "materiales") && (
        <ListaMaterias arr={tab === "insumos" ? insumos : materiales} total={tab === "insumos" ? valorDe(insumos) : valorDe(materiales)} />
      )}
    </div>
  );
}

function ValorCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-lg font-extrabold text-slate-900">{fmtCLP(Math.round(valor))}</p>
      <p className="text-xs font-semibold text-slate-500">{label} · invertido</p>
    </div>
  );
}

function ListaMaterias({ arr, total }: { arr: { id: string; nombre: string; unidad: string; stock: number; stockMinimo: number; costo: unknown }[]; total: number }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">En existencia ({arr.length})</h2>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Valor: {fmtCLP(Math.round(total))}</span>
      </div>
      {arr.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Sin registros. Créalos en Materias primas.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Insumo</th><th className="px-4 py-2 text-right">Stock</th><th className="px-4 py-2 text-right">Costo/u</th><th className="px-4 py-2 text-right">Valor</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {arr.map((m) => {
                const costo = m.costo != null ? Number(m.costo) : null;
                const bajo = stockBajo(m.stock, m.stockMinimo);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-semibold text-slate-800">{m.nombre}</td>
                    <td className={`px-4 py-2 text-right font-bold ${bajo ? "text-red-600" : "text-slate-900"}`}>{fmtCant(m.stock, m.unidad)}{bajo ? " ⚠" : ""}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{costo != null ? fmtCLP(costo) : "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-700">{costo != null ? fmtCLP(Math.round(m.stock * costo)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">Los insumos y materiales se crean y ajustan en <Link href="/admin/materias" className="text-[#1479c4]">Materias primas</Link>.</p>
    </div>
  );
}

function TablaStock({ titulo, productos, ubicaciones, cant, vacio }: { titulo: string; productos: Producto[]; ubicaciones: Ubicacion[]; cant: Map<string, number>; vacio?: string }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{titulo} ({productos.length})</h2>
      {productos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacio ?? "Sin productos."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Producto</th>{ubicaciones.map((u) => <th key={u.id} className="px-4 py-3 text-right">{u.nombre}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-semibold text-slate-800">{p.nombre}</td>
                  {ubicaciones.map((u) => {
                    const c = cant.get(`${p.id}:${u.id}`) ?? 0;
                    return <td key={u.id} className={`px-4 py-2 text-right ${c > 0 ? "text-slate-900" : "text-slate-300"}`}>{c}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
