import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setConfigPuntos, sumarPuntosPorCompra, canjearPuntos, ajustarPuntos } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function PuntosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const [empresa, negocios, agg] = await Promise.all([
    prisma.empresa.findFirst(),
    prisma.negocio.findMany({
      where: q ? { OR: [{ nombreNegocio: { contains: q, mode: "insensitive" } }, { nombreContacto: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: [{ puntos: "desc" }, { nombreNegocio: "asc" }],
      take: 100,
      select: {
        id: true, nombreNegocio: true, nombreContacto: true, comuna: true, puntos: true,
        movimientosPuntos: { orderBy: { fecha: "desc" }, take: 5, select: { id: true, puntos: true, tipo: true, motivo: true, fecha: true } },
      },
    }),
    prisma.negocio.aggregate({ _sum: { puntos: true }, _count: { _all: true }, where: { puntos: { gt: 0 } } }),
  ]);

  const porMonto = empresa?.puntosPorMonto ?? 1000;
  const activo = empresa?.puntosActivo ?? false;
  const enCirculacion = Number(agg._sum.puntos ?? 0);
  const conPuntos = agg._count._all;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">⭐ Puntos Benechito</h1>
        <p className="text-sm text-slate-500">Fideliza a tus clientes: juntan puntos por sus compras y los canjean por premios o descuentos.</p>
      </div>

      {/* Config */}
      <form action={setConfigPuntos} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" name="puntosActivo" defaultChecked={activo} className="h-4 w-4 accent-amber-500" /> Programa activo
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
          Regla: $ por 1 punto
          <input name="puntosPorMonto" inputMode="numeric" defaultValue={porMonto} className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <span className="text-xs text-slate-400">Ej: con {CLP(porMonto)} = 1 punto → una compra de {CLP(porMonto * 10)} da 10 puntos.</span>
        <button className="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Guardar regla</button>
      </form>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="Estado" valor={activo ? "Activo" : "Inactivo"} color={activo ? "#2f9e44" : "#94a3b8"} />
        <Kpi label="Clientes con puntos" valor={String(conPuntos)} color="#1479c4" />
        <Kpi label="Puntos en circulación" valor={enCirculacion.toLocaleString("es-CL")} color="#f28a1e" />
      </div>

      {/* Buscador */}
      <form className="mt-5 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar cliente…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Buscar</button>
      </form>

      {/* Clientes */}
      <div className="mt-4 space-y-2">
        {negocios.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Sin clientes que coincidan.</p>}
        {negocios.map((n) => (
          <details key={n.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-extrabold text-amber-700 tabular-nums">{n.puntos}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{n.nombreNegocio}</span>
                <span className="block truncate text-xs text-slate-400">{n.nombreContacto} · {n.comuna}</span>
              </span>
              <span className="text-xs text-slate-300">▾</span>
            </summary>

            <div className="space-y-3 border-t border-slate-100 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <form action={sumarPuntosPorCompra} className="rounded-lg bg-emerald-50 p-2">
                  <p className="mb-1 text-[11px] font-bold text-emerald-700">➕ Sumar por compra</p>
                  <input type="hidden" name="negocioId" value={n.id} />
                  <input name="monto" inputMode="numeric" placeholder="monto $" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                  <button className="mt-1 w-full rounded bg-emerald-600 py-1 text-xs font-bold text-white">Sumar puntos</button>
                </form>
                <form action={canjearPuntos} className="rounded-lg bg-amber-50 p-2">
                  <p className="mb-1 text-[11px] font-bold text-amber-700">🎁 Canjear</p>
                  <input type="hidden" name="negocioId" value={n.id} />
                  <input name="puntos" inputMode="numeric" placeholder="puntos" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                  <input name="motivo" placeholder="premio (opcional)" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                  <button className="mt-1 w-full rounded bg-amber-600 py-1 text-xs font-bold text-white">Canjear</button>
                </form>
                <form action={ajustarPuntos} className="rounded-lg bg-slate-50 p-2">
                  <p className="mb-1 text-[11px] font-bold text-slate-600">⚙️ Ajuste</p>
                  <input type="hidden" name="negocioId" value={n.id} />
                  <div className="flex gap-1">
                    <select name="signo" className="rounded border border-slate-300 px-1 py-1 text-sm"><option value="+">+</option><option value="-">−</option></select>
                    <input name="puntos" inputMode="numeric" placeholder="puntos" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                  </div>
                  <input name="motivo" placeholder="motivo" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                  <button className="mt-1 w-full rounded bg-slate-700 py-1 text-xs font-bold text-white">Ajustar</button>
                </form>
              </div>

              {n.movimientosPuntos.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">Últimos movimientos</p>
                  <ul className="space-y-0.5 text-xs">
                    {n.movimientosPuntos.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-slate-600">
                        <span className={`font-bold tabular-nums ${m.puntos >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.puntos >= 0 ? "+" : ""}{m.puntos}</span>
                        <span className="flex-1 truncate">{m.motivo ?? m.tipo}</span>
                        <span className="text-slate-400">{fmt(m.fecha)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">⭐ Más adelante los puntos se pueden sumar solos con cada venta y avisar por WhatsApp cuando el cliente junte para un premio.</p>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-lg font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
