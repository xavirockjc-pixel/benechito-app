import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import { CHECKLIST_VEHICULO, estadoRevisionColor, estadoRevisionLabel } from "@/lib/dominio/vehiculo";
import MiUbicacion from "./MiUbicacion";
import CatalogoVenta from "./CatalogoVenta";

export const dynamic = "force-dynamic";

const PENDIENTE = ["pendiente", "parcial", "vencido"];
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const saldoDe = (ventas: { total: unknown; pagos: { monto: unknown }[] }[]) =>
  ventas.reduce((s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)), 0);

export default async function VendedorHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sector?: string; vista?: string; vendido?: string; t?: string }>;
}) {
  const sp = await searchParams;
  const busca = (sp.q ?? "").trim();
  const sector = (sp.sector ?? "").trim();
  const vista = sp.vista === "todos" ? "todos" : "dia";
  const filtrando = !!busca || !!sector || vista === "todos";
  // Inicio = Resumen de la ruta. Pestañas: resumen (por defecto) | cat | dia.
  const tab = sp.t === "cat" ? "cat" : sp.t === "dia" ? "dia" : "resumen";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  // Pestañas del inicio.
  const Tabs = (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <Link href="/vendedor" className={tabCls(tab === "resumen")}>🏠 Resumen</Link>
      <Link href="/vendedor?t=cat" className={tabCls(tab === "cat")}>🛍️ Catálogo</Link>
      <Link href="/vendedor?t=dia" className={tabCls(tab === "dia")}>📋 Clientes</Link>
    </div>
  );

  // ================= RESUMEN (inicio) =================
  if (tab === "resumen") {
    const u = await usuarioActual();
    const usuarioRow = u?.sub ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true, nombre: true } }) : null;
    const vehiculoId = usuarioRow?.vehiculoId ?? null;

    const [ultimaRevision, ruta, pedidosPend, porVisitar] = await Promise.all([
      prisma.revisionVehiculo.findFirst({ where: vehiculoId ? { vehiculoId } : {}, orderBy: { fecha: "desc" } }),
      u ? prisma.ruta.findFirst({
        where: { vendedorId: u.sub, estado: { in: ["planificada", "en_curso"] } },
        orderBy: { fecha: "desc" },
        include: { paradas: { orderBy: { orden: "asc" }, include: { negocio: { select: { id: true, nombreNegocio: true, comuna: true, latitud: true, longitud: true } } } } },
      }) : null,
      prisma.pedido.findMany({
        where: { estado: { notIn: ["entregado", "finalizado"] } },
        include: { negocio: { select: { id: true, nombreNegocio: true, comuna: true } } },
        orderBy: { createdAt: "asc" }, take: 30,
      }),
      prisma.negocio.findMany({
        where: { estado: { not: "inactivo" }, proximaReposicion: { lte: hoy } },
        select: { id: true, nombreNegocio: true, comuna: true, proximaReposicion: true },
        orderBy: { proximaReposicion: "asc" }, take: 30,
      }),
    ]);

    // Km del día y estado del chequeo (desde la última revisión del vehículo).
    const revHoy = ultimaRevision ? new Date(ultimaRevision.fecha) >= hoy : false;
    const kmRecorrido = ultimaRevision && ultimaRevision.kmEntrada > ultimaRevision.kmSalida
      ? ultimaRevision.kmEntrada - ultimaRevision.kmSalida : null;
    const orden: Record<string, number> = { malo: 2, revisar: 1, ok: 0 };
    let peor = "ok";
    if (ultimaRevision) {
      for (const it of CHECKLIST_VEHICULO) {
        const e = (ultimaRevision as unknown as Record<string, string>)[it.campo] ?? "ok";
        if ((orden[e] ?? 0) > (orden[peor] ?? 0)) peor = e;
      }
    }

    // Pedidos únicos por cliente.
    const vistos = new Set<string>();
    const pedidos = pedidosPend.filter((p) => (vistos.has(p.negocioId) ? false : (vistos.add(p.negocioId), true)));

    // Clientes de la ruta de hoy: la ruta asignada, o los que toca reponer.
    const paradas = ruta?.paradas ?? [];
    const paradasPend = paradas.filter((p) => p.estado === "pendiente");
    const hayRuta = paradas.length > 0;

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Hola{usuarioRow?.nombre ? `, ${usuarioRow.nombre.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-xs text-slate-500">Resumen de tu ruta de hoy · {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>

        <MiUbicacion />
        {sp.vendido && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}
        {Tabs}

        {/* Vehículo: km del día + chequeo */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/vendedor/vehiculo" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
            <p className="text-2xl font-extrabold text-slate-900">{kmRecorrido != null ? `${kmRecorrido}` : "—"} <span className="text-sm font-bold text-slate-400">km</span></p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Recorrido {kmRecorrido != null ? "(última salida)" : ""}</p>
            {kmRecorrido == null && ultimaRevision && ultimaRevision.kmSalida > 0 && <p className="mt-0.5 text-xs text-slate-500">Salida: {ultimaRevision.kmSalida} km</p>}
          </Link>
          <Link href="/vendedor/vehiculo" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
            <p className="flex items-center gap-1.5 text-base font-extrabold" style={{ color: revHoy ? estadoRevisionColor[peor] : "#dc2626" }}>
              {revHoy ? (peor === "ok" ? "✅ Todo OK" : `⚠️ ${estadoRevisionLabel[peor]}`) : "🚗 Pendiente"}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Chequeo del vehículo</p>
            <p className="mt-0.5 text-xs text-[#1479c4]">{revHoy ? "Ver revisión ›" : "Revisar antes de salir ›"}</p>
          </Link>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-2">
          <AccionRapida href="/vendedor/venta-rapida" icon="🛒" label="Vender rápido" color="#1479c4" />
          <AccionRapida href="/vendedor/nuevo" icon="➕" label="Cliente nuevo" color="#0f766e" />
        </div>

        {/* Pedidos agendados para hoy */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">🧾 Pedidos agendados</h2>
            {pedidos.length > 0 && <Link href="/vendedor/entregas" className="text-xs font-bold text-[#1479c4]">Ver todos ›</Link>}
          </div>
          {pedidos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin pedidos pendientes para la ruta.</p>
          ) : (
            <div className="space-y-2">
              {pedidos.slice(0, 5).map((p) => (
                <Fila key={p.id} id={p.negocioId} nombre={p.negocio.nombreNegocio} sub={p.negocio.comuna || "—"}
                  badge={<span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">Pedido</span>} />
              ))}
              {pedidos.length > 5 && <p className="text-center text-xs text-slate-400">y {pedidos.length - 5} más…</p>}
            </div>
          )}
        </section>

        {/* Clientes de la ruta de hoy */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">
              {hayRuta ? `📍 Ruta de hoy (${paradasPend.length}/${paradas.length})` : "🔁 Por visitar hoy"}
            </h2>
            <Link href="/vendedor/ruta" className="text-xs font-bold text-[#1479c4]">Ver ruta ›</Link>
          </div>

          {hayRuta ? (
            paradasPend.length === 0 ? (
              <p className="text-sm text-emerald-600">🎉 ¡Ruta completa! Todas las paradas hechas.</p>
            ) : (
              <ol className="space-y-2">
                {paradasPend.slice(0, 6).map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1479c4] text-sm font-extrabold text-white">{i + 1}</span>
                    <Link href={`/vendedor/cliente/${p.negocio.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-900">{p.negocio.nombreNegocio}</span>
                      <span className="block truncate text-xs text-slate-500">{p.negocio.comuna || "—"}</span>
                    </Link>
                    {p.negocio.latitud && p.negocio.longitud && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.negocio.latitud},${p.negocio.longitud}`} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Ir</a>
                    )}
                  </li>
                ))}
              </ol>
            )
          ) : porVisitar.length === 0 ? (
            <p className="text-sm text-slate-500">Nada urgente por reponer hoy.</p>
          ) : (
            <div className="space-y-2">
              {porVisitar.slice(0, 6).map((c) => (
                <Fila key={c.id} id={c.id} nombre={c.nombreNegocio} sub={c.comuna || "—"}
                  badge={c.proximaReposicion ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">📅 {fmtDia(c.proximaReposicion)}</span> : null} />
              ))}
            </div>
          )}
        </section>

        {/* Cerrar turno: total vendido y cuadre de mercadería */}
        <Link href="/vendedor/cierre" className="block rounded-2xl bg-slate-900 py-4 text-center text-base font-extrabold text-white shadow active:brightness-110">
          🧾 Cerrar turno del día
        </Link>
      </div>
    );
  }

  // ================= CATÁLOGO =================
  if (tab === "cat") {
    return (
      <div>
        <div className="mb-3"><MiUbicacion /></div>
        {sp.vendido && <p className="mb-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}
        {Tabs}
        <h1 className="mb-2 text-lg font-extrabold text-slate-900">🛍️ Catálogo</h1>
        <p className="mb-3 text-xs text-slate-500">Muéstralo al cliente, elige por voz o tocando, y cierra la venta (boleta/factura, paga o queda debiendo).</p>
        <CatalogoVenta />
      </div>
    );
  }

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
    p.set("t", "dia");
    if (m.q) p.set("q", m.q);
    if (m.sector) p.set("sector", m.sector);
    if (m.vista && m.vista !== "dia") p.set("vista", m.vista);
    return `/vendedor?${p.toString()}`;
  };

  return (
    <div>
      <div className="mb-3"><MiUbicacion /></div>
      {sp.vendido && <p className="mb-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}
      {Tabs}

      {/* Buscador */}
      <form className="flex gap-2">
        <input type="hidden" name="t" value="dia" />
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
        {filtrando && <Link href="/vendedor?t=dia" className="rounded-full px-2.5 py-1 text-xs font-bold text-slate-400">✕ Ver del día</Link>}
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

function tabCls(activo: boolean) {
  return `rounded-xl py-2.5 text-center text-sm font-extrabold ${activo ? "bg-[#1479c4] text-white shadow" : "border border-slate-200 bg-white text-slate-500"}`;
}

function AccionRapida({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm active:scale-95">
      <span className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${color}18` }}>{icon}</span>
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </Link>
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
