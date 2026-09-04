import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { areaNotaLabel, areaNotaIcono } from "@/lib/dominio/notas";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);

type Senal = {
  clave: string; icon: string; titulo: string; detalle: string;
  valor: number; sev: 1 | 2 | 3; accion: string; href: string;
};

export default async function SupercerebroPage() {
  const ahora = Date.now();
  const hoy = new Date();
  const hace2 = new Date(ahora - 2 * 864e5);
  const hace30 = new Date(ahora - 30 * 864e5);

  const [
    notasAlta, notasAbiertas, notasResueltas30, notasPorAreaRaw, accionesSugeridas,
    mejPend, mejVenc, mejHechas,
    ventasCobrar, ventasVencidas, ventas30,
    pedidosAtascados,
    clientesPorReponer, clientesInactivos, clientesActivos, clientesNuevos30,
    productosMin, stockAgg,
    opProceso, opTerm30,
  ] = await Promise.all([
    prisma.nota.count({ where: { estado: "abierta", prioridad: "alta" } }),
    prisma.nota.count({ where: { estado: "abierta" } }),
    prisma.nota.count({ where: { estado: "hecha", hechaEn: { gte: hace30 } } }),
    prisma.nota.groupBy({ by: ["area"], _count: true, where: { estado: "abierta" } }),
    prisma.nota.count({ where: { accionEstado: "sugerida" } }),
    prisma.mejora.count({ where: { estado: "pendiente" } }),
    prisma.mejora.count({ where: { estado: { not: "hecha" }, fechaObjetivo: { lt: hoy } } }),
    prisma.mejora.count({ where: { estado: "hecha" } }),
    prisma.venta.count({ where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
    prisma.venta.count({ where: { estadoPago: "vencido" } }),
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { fecha: { gte: hace30 } } }),
    prisma.pedido.count({ where: { estado: { notIn: ["entregado", "finalizado"] }, createdAt: { lt: hace2 } } }),
    prisma.negocio.count({ where: { estado: { not: "inactivo" }, proximaReposicion: { lt: hoy } } }),
    prisma.negocio.count({ where: { estado: "inactivo" } }),
    prisma.negocio.count({ where: { estado: { in: ["punto_activo", "reposicion"] } } }),
    prisma.negocio.count({ where: { createdAt: { gte: hace30 } } }),
    prisma.producto.findMany({ where: { activo: true, stockMinimo: { gt: 0 } }, select: { id: true, stockMinimo: true } }),
    prisma.stock.groupBy({ by: ["productoId"], _sum: { cantidad: true } }),
    prisma.ordenProduccion.count({ where: { estado: "en_proceso" } }),
    prisma.ordenProduccion.aggregate({ _sum: { cantidadReal: true, merma: true }, where: { estado: "terminada", fechaTermino: { gte: hace30 } } }),
  ]);

  // Stock bajo mínimo
  const stockMap = new Map(stockAgg.map((s) => [s.productoId, num(s._sum.cantidad)]));
  const stockBajo = productosMin.filter((p) => (stockMap.get(p.id) ?? 0) < p.stockMinimo).length;

  // Producción / merma
  const prodReal30 = num(opTerm30._sum.cantidadReal);
  const merma30 = num(opTerm30._sum.merma);
  const mermaPct = prodReal30 + merma30 > 0 ? Math.round((merma30 / (prodReal30 + merma30)) * 100) : 0;

  const ventasTotal30 = num(ventas30._sum.total);
  const ventasCount30 = ventas30._count;

  // ---- FALENCIAS (debilidades a atacar) ----
  const falencias: Senal[] = [
    { clave: "notasAlta", icon: "🔴", titulo: "Notas urgentes sin resolver", detalle: `${notasAlta} nota(s) de prioridad alta abiertas`, valor: notasAlta, sev: 3, accion: "Resolver ahora", href: "/admin/notas?tipo=" },
    { clave: "acciones", icon: "⚡", titulo: "Acciones por confirmar", detalle: `${accionesSugeridas} nota(s) esperan un clic para mover stock`, valor: accionesSugeridas, sev: 2, accion: "Revisar bandeja", href: "/admin/notas" },
    { clave: "ventasVencidas", icon: "💸", titulo: "Cobros vencidos", detalle: `${ventasVencidas} venta(s) con pago vencido · ${ventasCobrar} por cobrar en total`, valor: ventasVencidas, sev: 3, accion: "Gestionar cobranza", href: "/admin/finanzas" },
    { clave: "stockBajo", icon: "📦", titulo: "Stock bajo el mínimo", detalle: `${stockBajo} producto(s) bajo su stock mínimo`, valor: stockBajo, sev: 3, accion: "Reponer / producir", href: "/admin/inventario" },
    { clave: "mejVenc", icon: "⏰", titulo: "Mejoras vencidas", detalle: `${mejVenc} mejora(s) pasaron su fecha objetivo`, valor: mejVenc, sev: 3, accion: "Repriorizar", href: "/admin/mejoras" },
    { clave: "pedidos", icon: "🧾", titulo: "Pedidos atascados", detalle: `${pedidosAtascados} pedido(s) llevan +2 días sin cerrar`, valor: pedidosAtascados, sev: 2, accion: "Despachar", href: "/admin/pedidos" },
    { clave: "reponer", icon: "🔁", titulo: "Clientes por reponer", detalle: `${clientesPorReponer} cliente(s) con reposición atrasada`, valor: clientesPorReponer, sev: 2, accion: "Agendar visita", href: "/admin/negocios" },
    { clave: "merma", icon: "🗑️", titulo: "Merma de producción alta", detalle: `${mermaPct}% de merma en los últimos 30 días`, valor: mermaPct >= 8 ? mermaPct : 0, sev: 2, accion: "Revisar recetas/proceso", href: "/admin/produccion" },
    { clave: "notasBacklog", icon: "📝", titulo: "Cola de notas creciendo", detalle: `${notasAbiertas} notas abiertas del equipo`, valor: notasAbiertas >= 8 ? notasAbiertas : 0, sev: 1, accion: "Revisar y depurar", href: "/admin/notas" },
    { clave: "mejPend", icon: "🚀", titulo: "Mejoras pendientes", detalle: `${mejPend} mejora(s) sin empezar`, valor: mejPend, sev: 1, accion: "Planificar", href: "/admin/mejoras" },
    { clave: "inactivos", icon: "😴", titulo: "Clientes inactivos", detalle: `${clientesInactivos} cliente(s) marcados inactivos`, valor: clientesInactivos, sev: 1, accion: "Campaña de recuperación", href: "/admin/negocios" },
  ];
  const activas = falencias.filter((f) => f.valor > 0);

  // Prioridades: por severidad y luego por magnitud
  const prioridades = [...activas].sort((a, b) => b.sev - a.sev || b.valor - a.valor).slice(0, 5);

  // ---- FORTALEZAS (lo que va bien) ----
  const fortalezas: Senal[] = [
    { clave: "ventas30", icon: "💵", titulo: "Ventas últimos 30 días", detalle: `${CLP(ventasTotal30)} en ${ventasCount30} venta(s)`, valor: ventasTotal30, sev: 1, accion: "", href: "/admin/ventas" },
    { clave: "activos", icon: "🏪", titulo: "Clientes activos", detalle: `${clientesActivos} punto(s) activos o en reposición`, valor: clientesActivos, sev: 1, accion: "", href: "/admin/negocios" },
    { clave: "nuevos", icon: "✨", titulo: "Clientes nuevos (30 días)", detalle: `${clientesNuevos30} cliente(s) captados`, valor: clientesNuevos30, sev: 1, accion: "", href: "/admin/negocios" },
    { clave: "prod30", icon: "🏭", titulo: "Producción reciente", detalle: `${prodReal30} unidad(es) terminadas en 30 días${opProceso ? ` · ${opProceso} en proceso` : ""}`, valor: prodReal30, sev: 1, accion: "", href: "/admin/produccion" },
    { clave: "mejHechas", icon: "✅", titulo: "Mejoras cumplidas", detalle: `${mejHechas} mejora(s) completadas`, valor: mejHechas, sev: 1, accion: "", href: "/admin/mejoras" },
    { clave: "notasResueltas", icon: "🧹", titulo: "Notas resueltas (30 días)", detalle: `${notasResueltas30} nota(s) cerradas`, valor: notasResueltas30, sev: 1, accion: "", href: "/admin/notas" },
  ];
  const fortActivas = fortalezas.filter((f) => f.valor > 0);

  // ---- Índice de salud (heurístico) ----
  const penal = activas.reduce((s, f) => s + (f.sev === 3 ? 12 : f.sev === 2 ? 7 : 3), 0);
  const salud = Math.max(5, Math.min(100, 100 - penal));
  const saludColor = salud >= 75 ? "#2f9e44" : salud >= 50 ? "#f28a1e" : "#e23b2c";
  const saludTxt = salud >= 75 ? "Sano" : salud >= 50 ? "Atención" : "Crítico";

  // ---- Notas por área (dónde se concentran los problemas) ----
  const porArea = notasPorAreaRaw
    .map((r) => ({ area: r.area, n: r._count }))
    .sort((a, b) => b.n - a.n);
  const maxArea = Math.max(1, ...porArea.map((a) => a.n));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">🧠 Supercerebro</h1>
          <p className="text-sm text-slate-500">Lee todo el sistema y te dice <b>qué atacar primero</b>: falencias vs. fortalezas. Se afina solo con más datos y con las <Link href="/admin/notas" className="font-semibold text-amber-600 hover:underline">notas del equipo</Link>.</p>
        </div>
      </div>

      {/* Índice de salud + resumen */}
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:col-span-1" style={{ borderTopColor: saludColor, borderTopWidth: 4 }}>
          <p className="text-4xl font-extrabold" style={{ color: saludColor }}>{salud}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Salud del sistema</p>
          <p className="mt-1 text-xs font-bold" style={{ color: saludColor }}>{saludTxt}</p>
        </div>
        <Mini label="Falencias activas" valor={activas.length} color="#e23b2c" />
        <Mini label="Fortalezas" valor={fortActivas.length} color="#2f9e44" />
        <Mini label="Notas abiertas" valor={notasAbiertas} color="#f28a1e" />
      </div>

      {/* Prioridades ahora */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🎯 Qué atacar primero</h2>
        {prioridades.length === 0 ? (
          <p className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">🎉 Sin falencias activas. Todo bajo control, ¡a potenciar las fortalezas!</p>
        ) : (
          <ol className="space-y-2">
            {prioridades.map((f, i) => (
              <li key={f.clave} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-extrabold text-white">{i + 1}</span>
                <span className="text-xl">{f.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{f.titulo} <SevBadge sev={f.sev} /></p>
                  <p className="text-xs text-slate-500">{f.detalle}</p>
                </div>
                <Link href={f.href} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600">{f.accion} →</Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Falencias / Fortalezas */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rose-600">⚠️ Falencias</h2>
          {activas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Ninguna detectada.</p>
          ) : (
            <ul className="space-y-2">
              {activas.sort((a, b) => b.sev - a.sev || b.valor - a.valor).map((f) => (
                <li key={f.clave} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{f.icon}</span>
                    <p className="flex-1 text-sm font-bold text-slate-900">{f.titulo} <SevBadge sev={f.sev} /></p>
                    <Link href={f.href} className="text-[11px] font-bold text-amber-600 hover:underline">{f.accion} →</Link>
                  </div>
                  <p className="mt-0.5 pl-7 text-xs text-slate-500">{f.detalle}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-emerald-600">💪 Fortalezas</h2>
          {fortActivas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Aún sin datos suficientes.</p>
          ) : (
            <ul className="space-y-2">
              {fortActivas.map((f) => (
                <li key={f.clave} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{f.icon}</span>
                    <p className="flex-1 text-sm font-bold text-slate-900">{f.titulo}</p>
                    <Link href={f.href} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">ver →</Link>
                  </div>
                  <p className="mt-0.5 pl-7 text-xs text-slate-500">{f.detalle}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Notas por área */}
      {porArea.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">📍 Dónde se concentran las notas abiertas</h2>
          <ul className="space-y-2">
            {porArea.map((a) => (
              <li key={a.area} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-xs font-bold text-slate-600">{areaNotaIcono[a.area] ?? "•"} {areaNotaLabel[a.area] ?? a.area}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(a.n / maxArea) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold text-slate-700">{a.n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400">🐝 El Supercerebro se recalcula cada vez que entras. Mientras más notas deje el equipo y más operación registres, mejores prioridades te dará.</p>
    </div>
  );
}

function Mini({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-2xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function SevBadge({ sev }: { sev: 1 | 2 | 3 }) {
  const map = { 3: ["Crítico", "bg-rose-100 text-rose-700"], 2: ["Medio", "bg-amber-100 text-amber-700"], 1: ["Leve", "bg-slate-100 text-slate-500"] } as const;
  const [txt, cls] = map[sev];
  return <span className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold align-middle ${cls}`}>{txt}</span>;
}
