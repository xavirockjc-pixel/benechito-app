import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import MiUbicacion from "./MiUbicacion";

export const dynamic = "force-dynamic";

const PENDIENTE = ["pendiente", "parcial", "vencido"];
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const saldoDe = (ventas: { total: unknown; pagos: { monto: unknown }[] }[]) =>
  ventas.reduce((s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)), 0);

export default async function VendedorHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; vista?: string; vendido?: string }>;
}) {
  const sp = await searchParams;
  const busca = (sp.q ?? "").trim();
  const sector = (sp.sector ?? "").trim();
  const vista = sp.vista === "todos" ? "todos" : "dia";
  const filtrando = !!busca || !!sector || vista === "todos";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // Sectores (comunas) para el filtro rápido.
  const comunasRaw = await prisma.negocio.groupBy({ by: ["comuna"], _count: true });
  const comunas = comunasRaw.map((c) => c.comuna).filter(Boolean).sort();

  // ---- Modo filtro/todos: lista de clientes ----
  const lista = filtrando
    ? await prisma.negocio.findMany({
        where: {
          ...(sector ? { comuna: sector } : {}),
          ...(busca ? { OR: [{ nombreNegocio: { contains: busca, mode: "insensitive" } }, { nombreContacto: { contains: busca, mode: "insensitive" } }] } : {}),
        },
        orderBy: [{ comuna: "asc" }, { nombreNegocio: "asc" }],
        take: 200,
        include: { ventas: { where: { estadoPago: { in: PENDIENTE } }, select: { total: true, pagos: { select: { monto: true } } } } },
      })
    : [];

  // ---- Vista del día ----
  const [porCobrarRaw, pedidosPend, porVisitar] = filtrando
    ? [[], [], []]
    : await Promise.all([
        prisma.negocio.findMany({
          where: { ventas: { some: { estadoPago: { in: PENDIENTE } } } },
          include: { ventas: { where: { estadoPago: { in: PENDIENTE } }, select: { total: true, pagos: { select: { monto: true } } } } },
          take: 80,
        }),
        prisma.pedido.findMany({
          where: { estado: { notIn: ["entregado", "finalizado"] } },
          include: { negocio: { select: { id: true, nombreNegocio: true, comuna: true } } },
          orderBy: { createdAt: "asc" }, take: 60,
        }),
        prisma.negocio.findMany({
          where: { estado: { not: "inactivo" }, proximaReposicion: { lte: hoy } },
          select: { id: true, nombreNegocio: true, comuna: true, proximaReposicion: true },
          orderBy: { proximaReposicion: "asc" }, take: 60,
        }),
      ]);

  const porCobrar = porCobrarRaw
    .map((c) => ({ id: c.id, nombre: c.nombreNegocio, comuna: c.comuna, saldo: saldoDe(c.ventas) }))
    .filter((c) => c.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  const deben = new Set(porCobrar.map((c) => c.id));

  const vistos = new Set<string>();
  const conPedido = pedidosPend.filter((p) => (vistos.has(p.negocioId) ? false : (vistos.add(p.negocioId), true)));
  // Por visitar: ocultar a los que deben (ya salen en "Por cobrar").
  const visitar = porVisitar.filter((c) => !deben.has(c.id));
  const nada = !filtrando && porCobrar.length === 0 && conPedido.length === 0 && visitar.length === 0;

  const qs = (patch: { q?: string; sector?: string; vista?: string }) => {
    const m = { q: busca, sector, vista, ...patch };
    const p = new URLSearchParams();
    if (m.q) p.set("q", m.q);
    if (m.sector) p.set("sector", m.sector);
    if (m.vista && m.vista !== "dia") p.set("vista", m.vista);
    const s = p.toString();
    return s ? `/vendedor?${s}` : "/vendedor";
  };

  return (
    <div>
      <div className="mb-3"><MiUbicacion /></div>
      {sp.vendido && <p className="mb-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}

      <Link href="/vendedor/venta-rapida" className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-extrabold text-white shadow active:brightness-95">
        ⚡ Venta rápida (sin cliente)
      </Link>

      {/* Buscador */}
      <form className="flex gap-2">
        <input name="q" defaultValue={busca} placeholder="🔎 Buscar cliente…" className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]" />
        {sector && <input type="hidden" name="sector" value={sector} />}
        <button className="rounded-xl bg-[#1479c4] px-4 font-bold text-white">Ir</button>
      </form>

      {/* Filtro por SECTOR + Ver todos */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link href={qs({ vista: "todos", sector: "" })} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${vista === "todos" && !sector ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>👥 Todos</Link>
        {comunas.map((c) => (
          <Link key={c} href={qs({ sector: sector === c ? "" : c, vista: "todos" })} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${sector === c ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>📍 {c}</Link>
        ))}
        {filtrando && <Link href="/vendedor" className="rounded-full px-2.5 py-1 text-xs font-bold text-slate-400">✕ Ver del día</Link>}
      </div>

      {filtrando ? (
        /* ---- Lista de clientes (todos / por sector / búsqueda) ---- */
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
            {sector ? `📍 ${sector}` : busca ? "Resultados" : "👥 Todos los clientes"} <span className="text-slate-400">({lista.length})</span>
          </h2>
          {lista.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Sin clientes que coincidan.</p>}
          {lista.map((c) => {
            const saldo = saldoDe(c.ventas);
            return (
              <Fila key={c.id} id={c.id} nombre={c.nombreNegocio} sub={`${c.comuna || "—"} · ${tipoClienteLabel[c.tipoCliente] ?? c.tipoCliente}`}
                badge={saldo > 0 ? <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Debe {fmtCLP(saldo)}</span> : null} />
            );
          })}
        </div>
      ) : (
        /* ---- Vista del día ---- */
        <div className="mt-4 space-y-5">
          {nada && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">🎉 Nada urgente hoy. Usa 👥 Todos o el buscador, o toca Venta rápida.</p>}

          {conPedido.length > 0 && (
            <Grupo titulo="🧾 Con pedido pendiente" color="#1479c4">
              {conPedido.map((p) => <Fila key={p.id} id={p.negocioId} nombre={p.negocio.nombreNegocio} sub={p.negocio.comuna || "—"} badge={<span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">Pedido</span>} />)}
            </Grupo>
          )}
          {porCobrar.length > 0 && (
            <Grupo titulo="💰 Quién debe (por cobrar)" color="#e23b2c">
              {porCobrar.map((c) => <Fila key={c.id} id={c.id} nombre={c.nombre} sub={c.comuna || "—"} badge={<span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Debe {fmtCLP(c.saldo)}</span>} />)}
            </Grupo>
          )}
          {visitar.length > 0 && (
            <Grupo titulo="🔁 Por visitar / reponer" color="#f28a1e">
              {visitar.map((c) => <Fila key={c.id} id={c.id} nombre={c.nombreNegocio} sub={c.comuna || "—"} badge={c.proximaReposicion ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">📅 {fmtDia(c.proximaReposicion)}</span> : null} />)}
            </Grupo>
          )}
        </div>
      )}
    </div>
  );
}

function Grupo({ titulo, color, children }: { titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide" style={{ color }}>{titulo}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Fila({ id, nombre, sub, badge }: { id: string; nombre: string; sub: string; badge?: React.ReactNode }) {
  return (
    <Link href={`/vendedor/cliente/${id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-900">{nombre}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      {badge ?? <span className="ml-2 shrink-0 text-slate-300">›</span>}
    </Link>
  );
}
