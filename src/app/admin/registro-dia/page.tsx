import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanalMaps } from "@/lib/dominio/canales";
import { medioPagoLabel } from "@/lib/dominio/ventas";

export const dynamic = "force-dynamic";

const num = (v: unknown) => Number(v ?? 0) || 0;
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const diaKey = (d: Date) => new Date(d).toLocaleDateString("es-CL");
function diaLabel(d: Date): string {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((hoy.getTime() - x.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
}

/**
 * Calendario central por día (desplegable): al abrir un día se ven las VENTAS,
 * los MOVIMIENTOS de dinero de la caja y los MOVIMIENTOS de bodega de ese día.
 */
export default async function RegistroDiaPage() {
  const DIAS = 21;
  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (DIAS - 1));

  const [ventas, movsCaja, movsBodega, { label: canalLabel }] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: desde } },
      orderBy: { fecha: "desc" }, take: 3000,
      include: { pagos: { select: { medio: true } }, negocio: { select: { nombreNegocio: true } }, vendedor: { select: { nombre: true } } },
    }),
    prisma.movimientoCaja.findMany({ where: { fecha: { gte: desde } }, orderBy: { fecha: "desc" }, take: 2000 }),
    prisma.movimientoBodega.findMany({ where: { zona: "bodega", fecha: { gte: desde } }, orderBy: { fecha: "desc" }, take: 3000 }),
    getCanalMaps(),
  ]);

  type Dia = { fecha: Date; ventas: typeof ventas; caja: typeof movsCaja; bodega: typeof movsBodega };
  const porDia = new Map<string, Dia>();
  const get = (d: Date) => {
    const k = diaKey(d);
    if (!porDia.has(k)) porDia.set(k, { fecha: new Date(d), ventas: [], caja: [], bodega: [] });
    return porDia.get(k)!;
  };
  for (const v of ventas) get(v.fecha).ventas.push(v);
  for (const m of movsCaja) get(m.fecha).caja.push(m);
  for (const m of movsBodega) get(m.fecha).bodega.push(m);

  const dias = [...porDia.values()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-[#1479c4]">← Panel</Link>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">📅 Registro por día</h1>
        <p className="text-sm text-slate-500">Toca un día para ver sus ventas, movimientos de caja y de bodega.</p>
      </div>

      {dias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Sin actividad en los últimos {DIAS} días.</p>
      ) : (
        <div className="space-y-2">
          {dias.map((d, i) => {
            const totalVentas = d.ventas.reduce((s, v) => s + num(v.total), 0);
            const ingresos = d.caja.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + num(m.monto), 0);
            const egresos = d.caja.filter((m) => m.tipo === "egreso").reduce((s, m) => s + num(m.monto), 0);
            // Ventas por canal.
            const porCanal = new Map<string, { n: number; total: number }>();
            for (const v of d.ventas) {
              const k = v.canal ?? "otro";
              const r = porCanal.get(k) ?? { n: 0, total: 0 };
              r.n += 1; r.total += num(v.total);
              porCanal.set(k, r);
            }
            return (
              <details key={diaKey(d.fecha)} open={i === 0} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold capitalize text-slate-900">{diaLabel(d.fecha)}</span>
                    <span className="text-xs text-slate-400">{new Date(d.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold">
                    <span className="text-green-700">💰 {fmtCLP(totalVentas)} ({d.ventas.length})</span>
                    {ingresos > 0 && <span className="text-emerald-600">➕ {fmtCLP(ingresos)}</span>}
                    {egresos > 0 && <span className="text-rose-600">➖ {fmtCLP(egresos)}</span>}
                    {d.bodega.length > 0 && <span className="text-slate-500">📦 {d.bodega.length} mov.</span>}
                  </div>
                </summary>

                <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                  {/* Ventas por canal + detalle */}
                  {d.ventas.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">💰 Ventas</p>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {[...porCanal.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, r]) => (
                          <span key={k} className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 ring-1 ring-green-100">
                            {canalLabel[k] ?? k}: {fmtCLP(r.total)} ({r.n})
                          </span>
                        ))}
                      </div>
                      <details>
                        <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Ver las {d.ventas.length} ventas</summary>
                        <ul className="mt-1 divide-y divide-slate-100 text-sm">
                          {d.ventas.map((v) => {
                            const medio = v.pagos[0]?.medio ?? "";
                            const quien = v.negocio?.nombreNegocio && v.negocio.nombreNegocio !== "Consumidor Final" ? v.negocio.nombreNegocio : (v.vendedor?.nombre ? `Ruta · ${v.vendedor.nombre}` : "Mostrador");
                            return (
                              <li key={v.id} className="flex items-center justify-between gap-2 py-1">
                                <span className="min-w-0 truncate text-slate-700">{quien} <span className="text-xs text-slate-400">· {canalLabel[v.canal ?? ""] ?? v.canal}{medio ? ` · ${medioPagoLabel[medio] ?? medio}` : ""}</span></span>
                                <span className="shrink-0 text-xs text-slate-500"><b className="text-slate-800">{fmtCLP(num(v.total))}</b> · {fmtHora(v.fecha)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </div>
                  )}

                  {/* Movimientos de caja (dinero) */}
                  {d.caja.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">💵 Movimientos de caja</p>
                      <ul className="divide-y divide-slate-100 text-sm">
                        {d.caja.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="min-w-0 truncate text-slate-700">{m.tipo === "ingreso" ? "➕" : "➖"} {m.concepto}</span>
                            <span className={`shrink-0 font-bold ${m.tipo === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}>{m.tipo === "ingreso" ? "+" : "−"}{fmtCLP(num(m.monto))} <span className="font-normal text-slate-400">{fmtHora(m.fecha)}</span></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Movimientos de bodega */}
                  {d.bodega.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">📦 Bodega</p>
                      <details>
                        <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Ver {d.bodega.length} movimientos</summary>
                        <ul className="mt-1 divide-y divide-slate-100 text-sm">
                          {d.bodega.map((m) => (
                            <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                              <span className="min-w-0">
                                <span className={`font-bold ${m.tipo === "entrada" ? "text-green-700" : m.tipo === "ajuste" ? "text-blue-600" : m.tipo === "mixto" ? "text-[#b45309]" : "text-red-600"}`}>
                                  {m.tipo === "entrada" ? "📥 +" : m.tipo === "ajuste" ? "✏️ " : m.tipo === "mixto" ? "🍬 " : "📤 −"}{m.cantidad}
                                </span>{" "}
                                <span className="text-slate-800">{m.nombre}</span>
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">{m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}

                  {d.ventas.length === 0 && d.caja.length === 0 && d.bodega.length === 0 && (
                    <p className="text-sm text-slate-400">Sin actividad este día.</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
