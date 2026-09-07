import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import MiUbicacion from "./MiUbicacion";

export const dynamic = "force-dynamic";

const PENDIENTE = ["pendiente", "parcial", "vencido"];
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function VendedorHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vendido?: string }>;
}) {
  const { q, vendido } = await searchParams;
  const busca = (q ?? "").trim();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // Resultados de búsqueda (solo cuando el vendedor busca a alguien puntual).
  const resultados = busca
    ? await prisma.negocio.findMany({
        where: {
          OR: [
            { nombreNegocio: { contains: busca, mode: "insensitive" } },
            { comuna: { contains: busca, mode: "insensitive" } },
            { nombreContacto: { contains: busca, mode: "insensitive" } },
          ],
        },
        orderBy: { nombreNegocio: "asc" },
        take: 40,
        include: { ventas: { where: { estadoPago: { in: PENDIENTE } }, select: { total: true, pagos: { select: { monto: true } } } } },
      })
    : [];

  // Vista del día (sin búsqueda): solo lo que toca.
  const [porCobrarRaw, pedidosPend, porVisitar] = busca
    ? [[], [], []]
    : await Promise.all([
        prisma.negocio.findMany({
          where: { ventas: { some: { estadoPago: { in: PENDIENTE } } } },
          include: { ventas: { where: { estadoPago: { in: PENDIENTE } }, select: { total: true, pagos: { select: { monto: true } } } } },
          take: 60,
        }),
        prisma.pedido.findMany({
          where: { estado: { notIn: ["entregado", "finalizado"] } },
          include: { negocio: { select: { id: true, nombreNegocio: true, comuna: true } } },
          orderBy: { createdAt: "asc" },
          take: 60,
        }),
        prisma.negocio.findMany({
          where: { estado: { not: "inactivo" }, proximaReposicion: { lte: hoy } },
          select: { id: true, nombreNegocio: true, comuna: true, proximaReposicion: true },
          orderBy: { proximaReposicion: "asc" },
          take: 60,
        }),
      ]);

  const saldoDe = (ventas: { total: unknown; pagos: { monto: unknown }[] }[]) =>
    ventas.reduce((s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)), 0);

  const porCobrar = porCobrarRaw
    .map((c) => ({ id: c.id, nombre: c.nombreNegocio, comuna: c.comuna, saldo: saldoDe(c.ventas) }))
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);

  // Pedidos → un cliente por fila (aunque tenga varios).
  const vistos = new Set<string>();
  const conPedido = pedidosPend.filter((p) => (vistos.has(p.negocioId) ? false : (vistos.add(p.negocioId), true)));

  const nada = !busca && porCobrar.length === 0 && conPedido.length === 0 && porVisitar.length === 0;

  return (
    <div>
      <div className="mb-3"><MiUbicacion /></div>

      {vendido && <p className="mb-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}

      <Link href="/vendedor/venta-rapida" className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-extrabold text-white shadow active:brightness-95">
        ⚡ Venta rápida (sin cliente)
      </Link>

      {/* Buscador: para entrar a cualquier cliente */}
      <form>
        <input name="q" defaultValue={busca} placeholder="🔎 Buscar cliente por nombre o comuna…"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]" />
      </form>

      {busca ? (
        /* ---- Resultados de búsqueda ---- */
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Resultados</h2>
            <Link href="/vendedor" className="text-xs font-bold text-[#1479c4]">✕ Limpiar</Link>
          </div>
          {resultados.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Sin resultados para “{busca}”.</p>}
          {resultados.map((c) => {
            const saldo = saldoDe(c.ventas);
            return (
              <Link key={c.id} href={`/vendedor/cliente/${c.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{c.nombreNegocio}</p>
                  <p className="truncate text-xs text-slate-500">{c.comuna || "—"} · {tipoClienteLabel[c.tipoCliente] ?? c.tipoCliente}</p>
                </div>
                {saldo > 0
                  ? <span className="ml-2 shrink-0 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Debe {fmtCLP(saldo)}</span>
                  : <span className="ml-2 shrink-0 text-slate-300">›</span>}
              </Link>
            );
          })}
        </div>
      ) : (
        /* ---- Vista del día: solo lo que toca ---- */
        <div className="mt-4 space-y-5">
          {nada && (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              🎉 Nada urgente hoy. Usa el buscador para entrar a un cliente, o toca <b>Venta rápida</b>.
            </p>
          )}

          {conPedido.length > 0 && (
            <Grupo titulo="🧾 Con pedido pendiente" color="#1479c4">
              {conPedido.map((p) => (
                <Fila key={p.id} id={p.negocioId} nombre={p.negocio.nombreNegocio} sub={p.negocio.comuna || "—"}
                  badge={<span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">Pedido</span>} />
              ))}
            </Grupo>
          )}

          {porCobrar.length > 0 && (
            <Grupo titulo="💰 Por cobrar" color="#e23b2c">
              {porCobrar.map((c) => (
                <Fila key={c.id} id={c.id} nombre={c.nombre} sub={c.comuna || "—"}
                  badge={<span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Debe {fmtCLP(c.saldo)}</span>} />
              ))}
            </Grupo>
          )}

          {porVisitar.length > 0 && (
            <Grupo titulo="🔁 Por visitar / reponer" color="#f28a1e">
              {porVisitar.map((c) => (
                <Fila key={c.id} id={c.id} nombre={c.nombreNegocio} sub={c.comuna || "—"}
                  badge={c.proximaReposicion ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">📅 {fmtDia(c.proximaReposicion)}</span> : null} />
              ))}
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
