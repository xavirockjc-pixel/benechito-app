import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fMes = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "—");

export default async function ClientesDashboard() {
  const hoy = Date.now();
  const hace30 = new Date(hoy - 30 * 864e5);

  const negocios = await prisma.negocio.findMany({
    select: {
      id: true, nombreNegocio: true, comuna: true, puntos: true, estado: true, createdAt: true, fechaIngreso: true,
      ventas: { select: { total: true, fecha: true, pagos: { select: { monto: true } } } },
    },
  });

  const clientes = negocios.map((c) => {
    const compras = c.ventas.filter((v) => num(v.total) > 0);
    const total = compras.reduce((s, v) => s + num(v.total), 0);
    const pagado = c.ventas.reduce((s, v) => s + v.pagos.reduce((a, p) => a + num(p.monto), 0), 0);
    const saldo = c.ventas.reduce((s, v) => s + num(v.total), 0) - pagado;
    const fechas = compras.map((v) => new Date(v.fecha).getTime());
    const ultima = fechas.length ? Math.max(...fechas) : null;
    const dias = ultima ? Math.floor((hoy - ultima) / 864e5) : null;
    const nCompras = compras.length;
    const ticket = nCompras ? total / nCompras : 0;
    const nuevo = new Date(c.createdAt) >= hace30;
    return { id: c.id, nombre: c.nombreNegocio, comuna: c.comuna, puntos: c.puntos ?? 0, total, saldo, ultima: ultima ? new Date(ultima) : null, dias, nCompras, ticket, nuevo };
  });

  const conCompras = clientes.filter((c) => c.nCompras > 0);
  const mejores = [...conCompras].sort((a, b) => b.total - a.total).slice(0, 10);
  const dormidos = conCompras.filter((c) => c.dias !== null && c.dias > 45).sort((a, b) => b.total - a.total).slice(0, 12);
  const nuevos = clientes.filter((c) => c.nuevo).slice(0, 12);
  const deudores = clientes.filter((c) => c.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 12);

  const totalVendido = conCompras.reduce((s, c) => s + c.total, 0);
  const ticketGlobal = conCompras.length ? totalVendido / conCompras.reduce((s, c) => s + c.nCompras, 0) : 0;
  const totalDeuda = clientes.reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const maxTotal = Math.max(1, ...mejores.map((c) => c.total));

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📊 Dashboard de clientes</h1>
        <p className="text-sm text-slate-500">Quiénes son tus mejores, quiénes se durmieron y a quién reactivar.</p>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Clientes que compran" valor={String(conCompras.length)} color="#1479c4" />
        <Kpi label="Total vendido" valor={CLP(totalVendido)} color="#2f9e44" />
        <Kpi label="Ticket promedio" valor={CLP(ticketGlobal)} color="#7c3aed" />
        <Kpi label="Por cobrar" valor={CLP(totalDeuda)} color="#e23b2c" />
      </div>

      {/* Mejores */}
      <Seccion titulo="🏆 Mejores clientes" sub="por total comprado" vacia="Aún sin ventas.">
        {mejores.map((c, i) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-extrabold text-white">{i + 1}</span>
              <Link href={`/admin/negocios/${c.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 hover:underline">{c.nombre}</p>
                <p className="text-[11px] text-slate-400">{c.nCompras} compra(s) · última {fMes(c.ultima)}{c.saldo > 0 ? ` · debe ${CLP(c.saldo)}` : ""}</p>
              </Link>
              <span className="shrink-0 text-sm font-extrabold text-emerald-700 tabular-nums">{CLP(c.total)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(c.total / maxTotal) * 100}%` }} /></div>
          </li>
        ))}
      </Seccion>

      {/* Por reactivar */}
      <Seccion titulo="😴 Dormidos — por reactivar" sub="+45 días sin comprar (los de más valor primero)" vacia="Nadie dormido. ¡Bien ahí!">
        {dormidos.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm">
            <Link href={`/admin/negocios/${c.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900 hover:underline">{c.nombre}</p>
              <p className="text-[11px] text-slate-500">{c.comuna || "—"} · compró {c.nCompras} vez(ces) · total {CLP(c.total)}</p>
            </Link>
            <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{c.dias} días</span>
          </li>
        ))}
      </Seccion>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Nuevos */}
        <Seccion titulo="✨ Nuevos (30 días)" sub="" vacia="Sin clientes nuevos." compacta>
          {nuevos.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <Link href={`/admin/negocios/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 hover:underline">{c.nombre}</Link>
              <span className="ml-2 shrink-0 text-[11px] text-slate-400">{c.nCompras} compra(s)</span>
            </li>
          ))}
        </Seccion>

        {/* Deudores */}
        <Seccion titulo="💰 Mayores deudas" sub="" vacia="Nadie debe. 🎉" compacta>
          {deudores.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <Link href={`/admin/negocios/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 hover:underline">{c.nombre}</Link>
              <span className="ml-2 shrink-0 text-xs font-bold text-rose-600 tabular-nums">{CLP(c.saldo)}</span>
            </li>
          ))}
        </Seccion>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">📊 Se recalcula solo con cada venta. Toca un cliente para ver su ficha y su vida completa.</p>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-lg font-extrabold text-slate-900 tabular-nums" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Seccion({ titulo, sub, vacia, children, compacta }: { titulo: string; sub: string; vacia: string; children: React.ReactNode; compacta?: boolean }) {
  const items = Array.isArray(children) ? children : [children];
  const vacio = items.filter(Boolean).length === 0;
  return (
    <div className={compacta ? "mt-6" : "mt-6"}>
      <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {sub && <p className="mb-2 text-[11px] text-slate-400">{sub}</p>}
      {vacio ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacia}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}
