import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

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

export default async function HistorialBodega() {
  const DIAS = 14;
  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (DIAS - 1));

  const [movs, ventas, devos] = await Promise.all([
    prisma.movimientoBodega.findMany({ where: { zona: "bodega", fecha: { gte: desde } }, orderBy: { fecha: "desc" }, take: 1500 }),
    prisma.venta.findMany({
      where: { fecha: { gte: desde }, canal: { in: ["local", "terreno", "directa"] } },
      orderBy: { fecha: "desc" }, take: 1500,
      include: { vendedor: { select: { nombre: true } }, negocio: { select: { nombreNegocio: true } } },
    }),
    prisma.movimientoStock.findMany({
      where: { fecha: { gte: desde }, referencia: "devolucion-ruta" },
      orderBy: { fecha: "desc" }, take: 1500,
      include: { producto: { select: { nombre: true } } },
    }),
  ]);

  // Agrupa todo por día.
  type Dia = { fecha: Date; movs: typeof movs; ventas: typeof ventas; devos: typeof devos };
  const porDia = new Map<string, Dia>();
  const get = (d: Date) => {
    const k = diaKey(d);
    if (!porDia.has(k)) porDia.set(k, { fecha: new Date(d), movs: [], ventas: [], devos: [] });
    return porDia.get(k)!;
  };
  for (const m of movs) get(m.fecha).movs.push(m);
  for (const v of ventas) get(v.fecha).ventas.push(v);
  for (const d of devos) get(d.fecha).devos.push(d);

  const dias = [...porDia.values()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">📅 Registro por día</h1>
          <p className="text-xs text-slate-500">Movimientos, ventas y devoluciones de cada día. Toca un día para abrirlo.</p>
        </div>
        <Link href="/bodega" className="shrink-0 text-sm font-semibold text-[#b45309]">← Bodega</Link>
      </div>

      {dias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Sin movimientos en los últimos {DIAS} días.</p>
      ) : (
        <div className="space-y-2">
          {dias.map((d, i) => {
            const totalVentas = d.ventas.reduce((s, v) => s + num(v.total), 0);
            const uDevueltas = d.devos.reduce((s, x) => s + num(x.cantidad), 0);
            // Ventas agrupadas por vendedor (o Local/Caja).
            const porVend = new Map<string, { n: number; total: number }>();
            for (const v of d.ventas) {
              const quien = v.vendedor?.nombre ?? (v.canal === "local" ? "Local / Caja" : "Ruta");
              const r = porVend.get(quien) ?? { n: 0, total: 0 };
              r.n += 1; r.total += num(v.total);
              porVend.set(quien, r);
            }
            return (
              <details key={diaKey(d.fecha)} open={i === 0} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold capitalize text-slate-900">{diaLabel(d.fecha)}</span>
                    <span className="text-xs text-slate-400">{new Date(d.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold">
                    <span className="text-slate-500">📦 {d.movs.length} mov.</span>
                    <span className="text-green-700">💰 {fmtCLP(totalVentas)} ({d.ventas.length})</span>
                    {uDevueltas > 0 && <span className="text-[#b45309]">↩️ {uDevueltas} u devueltas</span>}
                  </div>
                </summary>

                <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                  {/* Ventas por vendedor */}
                  {porVend.size > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">💰 Ventas</p>
                      <ul className="space-y-0.5 text-sm">
                        {[...porVend.entries()].sort((a, b) => b[1].total - a[1].total).map(([quien, r]) => (
                          <li key={quien} className="flex justify-between">
                            <span className="text-slate-700">{quien} <span className="text-xs text-slate-400">· {r.n}</span></span>
                            <span className="font-bold text-slate-900">{fmtCLP(r.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Movimientos de bodega */}
                  {d.movs.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">📦 Movimientos</p>
                      <ul className="divide-y divide-slate-100 text-sm">
                        {d.movs.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="min-w-0">
                              <span className={`font-bold ${m.tipo === "entrada" ? "text-green-700" : m.tipo === "mixto" ? "text-[#b45309]" : m.tipo === "ajuste" ? "text-blue-600" : "text-red-600"}`}>
                                {m.tipo === "entrada" ? "📥 +" : m.tipo === "mixto" ? "🍬 " : m.tipo === "ajuste" ? "✏️ " : "📤 −"}{m.cantidad}
                              </span>{" "}
                              <span className="text-slate-800">{m.nombre}</span>
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">{m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Devoluciones de ruta */}
                  {d.devos.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">↩️ Devoluciones (volvió a bodega)</p>
                      <ul className="divide-y divide-slate-100 text-sm">
                        {d.devos.map((x) => (
                          <li key={x.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="text-slate-800">{x.producto.nombre}</span>
                            <span className="shrink-0 font-bold text-[#b45309]">+{x.cantidad} <span className="text-xs font-normal text-slate-400">{fmtHora(x.fecha)}</span></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {d.movs.length === 0 && d.ventas.length === 0 && d.devos.length === 0 && (
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
