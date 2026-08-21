import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TIPOS_MOVIMIENTO, tipoMovimientoLabel } from "@/lib/dominio/inventario";
import { registrarMovimiento } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function InventarioPage() {
  const [productos, ubicaciones, stock, movimientos] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.ubicacion.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.stock.findMany(),
    prisma.movimientoStock.findMany({
      orderBy: { fecha: "desc" },
      take: 15,
      include: { producto: { select: { nombre: true } } },
    }),
  ]);

  const cant = new Map(stock.map((s) => [`${s.productoId}:${s.ubicacionId}`, s.cantidad]));
  const nombreUbic = new Map(ubicaciones.map((u) => [u.id, u.nombre]));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">
            Stock por ubicación. Cargar un vehículo es una <strong>transferencia</strong>, no una venta.
          </p>
        </div>
        <Link
          href="/admin/inventario/ubicaciones"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
        >
          Ubicaciones
        </Link>
      </div>

      {ubicaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No hay ubicaciones. Crea al menos una en <Link href="/admin/inventario/ubicaciones" className="text-naranja">Ubicaciones</Link>.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                {ubicaciones.map((u) => (
                  <th key={u.id} className="px-4 py-3 text-right">{u.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-semibold text-slate-800">{p.nombre}</td>
                  {ubicaciones.map((u) => {
                    const c = cant.get(`${p.id}:${u.id}`) ?? 0;
                    return (
                      <td key={u.id} className={`px-4 py-2 text-right ${c > 0 ? "text-slate-900" : "text-slate-300"}`}>
                        {c}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrar movimiento */}
      {ubicaciones.length > 0 && productos.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Registrar movimiento</h2>
          <form action={registrarMovimiento} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">Tipo
              <select name="tipo" required defaultValue="ingreso" className={`mt-1 ${inputCls}`}>
                {TIPOS_MOVIMIENTO.map((t) => <option key={t} value={t}>{tipoMovimientoLabel[t]}</option>)}
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
            <label className="text-sm font-bold text-slate-700">Origen <span className="font-normal text-slate-400">(transferencia / merma)</span>
              <select name="ubicacionOrigenId" defaultValue="" className={`mt-1 ${inputCls}`}>
                <option value="">—</option>
                {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">Destino <span className="font-normal text-slate-400">(ingreso / transferencia / ajuste)</span>
              <select name="ubicacionDestinoId" defaultValue="" className={`mt-1 ${inputCls}`}>
                <option value="">—</option>
                {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <button className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
                Registrar
              </button>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            En “ajuste”, la cantidad es el stock <strong>exacto</strong> que quedará en el destino.
          </p>
        </section>
      )}

      {/* Últimos movimientos */}
      {movimientos.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Últimos movimientos</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span className="text-slate-700">
                  <strong>{tipoMovimientoLabel[m.tipo] ?? m.tipo}</strong> · {m.producto.nombre}
                  {m.ubicacionOrigenId ? ` · desde ${nombreUbic.get(m.ubicacionOrigenId) ?? "?"}` : ""}
                  {m.ubicacionDestinoId ? ` · a ${nombreUbic.get(m.ubicacionDestinoId) ?? "?"}` : ""}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`font-semibold ${m.cantidad < 0 ? "text-rojo" : "text-slate-900"}`}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </span>
                  <span className="text-xs text-slate-400">{fmtHora(m.fecha)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
