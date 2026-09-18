import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { analisisProduccion } from "@/lib/dominio/fabricacion";
import { lineaLabel } from "@/lib/dominio/produccion";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

/** Unidades producidas por trabajador en el rango + pago estimado por trato. */
async function pagoVsProduccion(desde: Date, hasta: Date) {
  const [trabajadores, eventos] = await Promise.all([
    prisma.trabajador.findMany({
      where: { activo: true, usuarioId: { not: null } },
      select: { usuarioId: true, nombre: true, modalidadPago: true, tarifa: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.movimientoBodega.findMany({
      where: { zona: "produccion", tipo: "entrada", fecha: { gte: desde, lt: hasta } },
      select: { cantidad: true, usuarioId: true, participantes: true },
    }),
  ]);
  // Unidades atribuidas a cada usuario (divididas si el turno lo trabajaron varios).
  const prod = new Map<string, number>();
  for (const e of eventos) {
    const ids = e.participantes?.trim() ? e.participantes.split(",").map((s) => s.trim()).filter(Boolean) : e.usuarioId ? [e.usuarioId] : [];
    if (ids.length === 0) continue;
    const share = e.cantidad / ids.length;
    for (const id of ids) prod.set(id, (prod.get(id) ?? 0) + share);
  }
  const filas = trabajadores
    .map((t) => {
      const unidades = t.usuarioId ? (prod.get(t.usuarioId) ?? 0) : 0;
      const tarifa = t.tarifa != null ? Number(t.tarifa) : 0;
      const porTrato = t.modalidadPago === "por_trato";
      const pago = porTrato ? Math.round(tarifa * unidades) : 0;
      return { nombre: t.nombre, unidades: Math.round(unidades), porTrato, tarifa, pago };
    })
    .filter((f) => f.unidades > 0)
    .sort((a, b) => b.unidades - a.unidades);
  const totalPago = filas.reduce((s, f) => s + f.pago, 0);
  const totalUnid = filas.reduce((s, f) => s + f.unidades, 0);
  return { filas, totalPago, totalUnid };
}

const RANGOS: Record<string, { label: string; dias: number }> = {
  hoy: { label: "Hoy", dias: 1 },
  "7d": { label: "7 días", dias: 7 },
  "30d": { label: "30 días", dias: 30 },
  "90d": { label: "90 días", dias: 90 },
};

const fmtFechaHora = (iso: string) => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const nLinea = (l: string) => lineaLabel[l] ?? l;

export default async function ProduccionAnalisisPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const rango = RANGOS[r ?? "30d"] ? (r ?? "30d") : "30d";
  const dias = RANGOS[rango].dias;

  const hasta = new Date();
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - (dias - 1));

  const { porLinea, insumos, costoTotal, mermas, mermaTotal, cierres } = await analisisProduccion(desde, hasta);
  const pago = await pagoVsProduccion(desde, hasta);

  const litrosTot = porLinea.reduce((s, l) => s + l.litros, 0);
  const unidadesTot = porLinea.reduce((s, l) => s + l.unidades, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Análisis de producción</h1>
      <p className="text-sm text-slate-500">Cuánto se produjo y rindió por línea, qué insumos se gastaron (con costo), las mermas y el historial de cierres de turno.</p>

      {/* Rango */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(RANGOS).map(([k, v]) => (
          <Link key={k} href={`/admin/produccion-analisis?r=${k}`}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${rango === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {v.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Litros mezclados</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{Math.round(litrosTot * 10) / 10} <span className="text-sm font-bold text-slate-400">L</span></p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Unidades producidas</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{unidadesTot.toLocaleString("es-CL")}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Gasto en insumos</p><p className="mt-1 text-2xl font-extrabold text-teal-700">{fmtCLP(costoTotal)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Mermas</p><p className="mt-1 text-2xl font-extrabold text-red-600">{mermaTotal.toLocaleString("es-CL")} <span className="text-sm font-bold text-slate-400">u</span></p></div>
      </div>

      {porLinea.length === 0 && insumos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Sin fabricaciones ni consumos en este rango. Registra producción en la app y vuelve.
        </p>
      ) : (
        <>
          {/* Rendimiento por línea */}
          <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Rendimiento por línea</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Línea</th>
                  <th className="px-4 py-3 text-right">Litros</th>
                  <th className="px-4 py-3 text-right">Unidades</th>
                  <th className="px-4 py-3 text-right">Rinde (u/L)</th>
                  <th className="px-4 py-3 text-right">Tandas</th>
                  <th className="px-4 py-3 text-right">Costo insumos</th>
                  <th className="px-4 py-3 text-right">Costo/unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {porLinea.map((l) => (
                  <tr key={l.linea} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{nLinea(l.linea)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{Math.round(l.litros * 10) / 10}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{l.unidades.toLocaleString("es-CL")}</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700">{l.rendimiento}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{l.tandas}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCLP(l.costoInsumos)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{l.unidades > 0 ? fmtCLP(l.costoInsumos / l.unidades) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insumos gastados */}
          <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Insumos gastados</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3">Por línea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insumos.map((i) => (
                  <tr key={i.nombre} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{i.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{i.categoria ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{Math.round(i.cantidad * 100) / 100} {i.unidad}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{i.costo > 0 ? fmtCLP(i.costo) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {Object.entries(i.porLinea).map(([k, v]) => `${nLinea(k)}: ${Math.round(v * 100) / 100}`).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900" colSpan={3}>Total insumos</td>
                  <td className="px-4 py-3 text-right font-extrabold text-teal-700">{fmtCLP(costoTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-1 text-xs text-slate-400">El costo usa el precio unitario de cada insumo (Materias primas). Si un insumo no tiene costo cargado, suma 0.</p>

          {/* Mermas */}
          {mermas.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Mermas y ajustes</h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {mermas.map((m) => (
                      <tr key={m.nombre} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-800">{m.nombre}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">-{m.cantidad.toLocaleString("es-CL")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pago vs producción */}
          {pago.filas.length > 0 && (
            <>
              <h2 className="mt-8 mb-1 text-lg font-bold text-slate-900">Pago vs producción</h2>
              <p className="mb-3 text-xs text-slate-500">Unidades atribuidas a cada trabajador (divididas si el turno lo trabajaron varios) y el pago por trato estimado.</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Trabajador</th>
                      <th className="px-4 py-3 text-right">Unidades</th>
                      <th className="px-4 py-3 text-right">Tarifa</th>
                      <th className="px-4 py-3 text-right">Pago estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pago.filas.map((f) => (
                      <tr key={f.nombre} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{f.nombre}{!f.porTrato && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">sueldo fijo</span>}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{f.unidades.toLocaleString("es-CL")}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{f.porTrato ? `${fmtCLP(f.tarifa)}/u` : "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">{f.porTrato ? fmtCLP(f.pago) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{pago.totalUnid.toLocaleString("es-CL")}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">costo M.O./u</td>
                      <td className="px-4 py-3 text-right font-extrabold text-teal-700">{fmtCLP(pago.totalPago)}{pago.totalUnid > 0 && <span className="ml-1 text-[11px] font-semibold text-slate-400">({fmtCLP(pago.totalPago / pago.totalUnid)}/u)</span>}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-1 text-xs text-slate-400">El pago por trato sale de la tarifa por unidad de cada trabajador (Pagos al equipo). El pago definitivo se cierra en esa sección.</p>
            </>
          )}

          {/* Historial de cierres */}
          <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Cierres de turno</h2>
          {cierres.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay cierres de turno en este rango.</p>
          ) : (
            <div className="space-y-3">
              {cierres.map((c, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs font-bold text-slate-400">{fmtFechaHora(c.fecha)}</p>
                  <div className="space-y-1">
                    {c.lineas.map((l, j) => (
                      <div key={j} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">{nLinea(l.linea)}</span>
                        <span className="text-xs text-slate-500">{Math.round(l.litros * 10) / 10} L · estimado {l.estimado} · real {l.real}</span>
                        <span className={`text-xs font-bold ${l.diferencia === 0 ? "text-slate-500" : l.diferencia > 0 ? "text-green-700" : "text-red-600"}`}>
                          {l.diferencia > 0 ? `+${l.diferencia}` : l.diferencia} · {l.rendimiento} u/L
                        </span>
                      </div>
                    ))}
                    {c.lineas.length === 0 && <p className="text-xs text-slate-400">Cierre sin líneas con conteo.</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-xs text-slate-400">
        Los datos salen de las fabricaciones y cierres de la app de Producción. Próximo paso: cruzar con ventas para ver producido vs vendido por sabor.
      </p>
    </div>
  );
}
