import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { estadoOPLabel, estadoOPColor } from "@/lib/dominio/produccion";
import { crearOP } from "./actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500";

export default async function ProduccionPage() {
  const [productos, ordenes] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.ordenProduccion.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { producto: { select: { nombre: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Producción</h1>
      <p className="text-sm text-slate-500">
        Órdenes de fabricación. Al terminarse, el producto ingresa automáticamente a bodega.
      </p>

      {/* Nueva OP */}
      <form action={crearOP} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Nueva orden</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold text-slate-700 lg:col-span-2">Producto
            <select name="productoId" required defaultValue="" className={`mt-1 ${inputCls}`}>
              <option value="">Selecciona…</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Cantidad a producir
            <input type="number" name="cantidadPlan" min="1" step="1" required inputMode="numeric" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Lote (opcional)
            <input name="lote" placeholder="L-2026-08" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Responsable
            <input name="responsable" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700 lg:col-span-3">Notas
            <input name="notas" className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
          Crear orden
        </button>
      </form>

      {/* Lista */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Órdenes recientes</h2>
      {ordenes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay órdenes de producción.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Plan</th>
                <th className="px-4 py-3 text-right">Real</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordenes.map((op) => {
                const c = estadoOPColor[op.estado];
                return (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/produccion/${op.id}`} className="font-semibold text-slate-900 hover:text-naranja">
                        {op.producto.nombre}
                      </Link>
                      {op.lote && <span className="ml-2 text-xs text-slate-400">lote {op.lote}</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{op.cantidadPlan}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{op.cantidadReal ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
                        {estadoOPLabel[op.estado] ?? op.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtFecha(op.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
