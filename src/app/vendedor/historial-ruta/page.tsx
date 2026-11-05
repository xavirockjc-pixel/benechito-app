import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { RUTAS, rutaDeComuna } from "@/lib/dominio/sectores";

export const dynamic = "force-dynamic";

const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
const PERIODOS: Record<string, { label: string; dias: number | null }> = {
  "30": { label: "30 días", dias: 30 },
  "90": { label: "90 días", dias: 90 },
  todo: { label: "Todo", dias: null },
};

/**
 * Historial por ruta: ranking de clientes de una ruta por lo que compran (total,
 * nº de pedidos, última compra, deuda). Para ver el comportamiento de la zona.
 */
export default async function HistorialRuta({ searchParams }: { searchParams: Promise<{ ruta?: string; p?: string }> }) {
  const sp = await searchParams;
  const rutaSel = (sp.ruta ?? "").trim();
  const per = PERIODOS[sp.p ?? "90"] ? (sp.p ?? "90") : "90";
  const desde = PERIODOS[per].dias != null ? new Date(Date.now() - PERIODOS[per].dias! * 86400000) : null;

  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: {
      id: true, nombreNegocio: true, comuna: true, sector: true,
      ventas: {
        where: desde ? { fecha: { gte: desde } } : {},
        select: { total: true, fecha: true, pagos: { select: { monto: true } } },
      },
    },
    take: 3000,
  });

  // Clientes por ruta elegida con su resumen de compras del período.
  const filas = negocios
    .filter((n) => !rutaSel || rutaDeComuna(n.sector || n.comuna).clave === rutaSel)
    .map((n) => {
      const total = n.ventas.reduce((s, v) => s + Number(v.total), 0);
      const pagado = n.ventas.reduce((s, v) => s + v.pagos.reduce((a, p) => a + Number(p.monto), 0), 0);
      const ultima = n.ventas.reduce<Date | null>((mx, v) => (!mx || v.fecha > mx ? v.fecha : mx), null);
      return { id: n.id, nombre: n.nombreNegocio, comuna: n.comuna, nCompras: n.ventas.length, total, deuda: total - pagado, ultima };
    })
    .filter((f) => f.nCompras > 0)
    .sort((a, b) => b.total - a.total);

  const totalRuta = filas.reduce((s, f) => s + f.total, 0);
  const deudaRuta = filas.reduce((s, f) => s + Math.max(0, f.deuda), 0);

  // Rutas presentes (con clientes), orden canónico.
  const presentes = new Set(negocios.map((n) => rutaDeComuna(n.sector || n.comuna).clave));
  const rutas = RUTAS.filter((r) => presentes.has(r.clave));
  const rutaLabel = RUTAS.find((r) => r.clave === rutaSel)?.label ?? rutaSel;

  const href = (patch: { ruta?: string; p?: string }) => {
    const m = { ruta: rutaSel, p: per, ...patch };
    const q = new URLSearchParams();
    if (m.ruta) q.set("ruta", m.ruta);
    if (m.p && m.p !== "90") q.set("p", m.p);
    return `/vendedor/historial-ruta${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">📊 Historial por ruta</h1>
        <p className="text-xs text-slate-500">Qué compra cada cliente de la zona. Toca uno para ver su historial completo.</p>
      </div>

      {/* Período */}
      <div className="flex gap-1.5">
        {Object.entries(PERIODOS).map(([k, v]) => (
          <Link key={k} href={href({ p: k })} className={`rounded-full border px-3 py-1 text-xs font-bold ${per === k ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>{v.label}</Link>
        ))}
      </div>

      {/* Ruta */}
      <div className="flex flex-wrap gap-1.5">
        <Link href={href({ ruta: "" })} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${!rutaSel ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>👥 Todas</Link>
        {rutas.map((r) => (
          <Link key={r.clave} href={href({ ruta: r.clave })} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${rutaSel === r.clave ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>📍 {r.label}</Link>
        ))}
      </div>

      {/* Totales de la selección */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{rutaSel ? rutaLabel : "Todas las rutas"} · {PERIODOS[per].label}</p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-900">{fmtCLP(totalRuta)}</p>
          <p className="text-[11px] text-slate-400">{filas.length} clientes compraron</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-400">Por cobrar</p>
          <p className="mt-0.5 text-lg font-extrabold text-red-600">{fmtCLP(deudaRuta)}</p>
        </div>
      </div>

      {/* Ranking de clientes */}
      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Sin compras en este período.</p>
      ) : (
        <ol className="space-y-2">
          {filas.map((f, i) => (
            <li key={f.id}>
              <Link href={`/vendedor/cliente/${f.id}/historial`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:bg-slate-50">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{f.nombre}</span>
                  <span className="block truncate text-[11px] text-slate-400">{f.comuna || "—"} · {f.nCompras} compra{f.nCompras > 1 ? "s" : ""}{f.ultima ? ` · últ. ${fmtDia(f.ultima)}` : ""}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-extrabold text-slate-900">{fmtCLP(f.total)}</span>
                  {f.deuda > 0 && <span className="text-[11px] font-bold text-red-600">debe {fmtCLP(f.deuda)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
