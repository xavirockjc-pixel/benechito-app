import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { crearAgenda, cambiarEstadoAgenda, eliminarAgenda, mandarAFabricar } from "./actions";

export const dynamic = "force-dynamic";

const tipoMeta: Record<string, { label: string; color: string; bg: string }> = {
  apartar: { label: "Apartar", color: "#0e7490", bg: "#cffafe" },
  mezclar: { label: "Mezclar", color: "#b45309", bg: "#fef3c7" },
  fabricar: { label: "Fabricar", color: "#0f766e", bg: "#ccfbf1" },
  entrega: { label: "Entrega", color: "#1479c4", bg: "#dbeafe" },
  otro: { label: "Otro", color: "#64748b", bg: "#f1f5f9" },
};
const estadoMeta: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "#b45309" },
  en_proceso: { label: "En proceso", color: "#0e7490" },
  hecho: { label: "Hecho", color: "#2f7d34" },
  cancelado: { label: "Cancelado", color: "#94a3b8" },
};
// Colores de los movimientos de la planta que se suman al calendario.
const movMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  produccion: { label: "Producción", color: "#0f766e", bg: "#ccfbf1", icon: "🏭" },
  venta: { label: "Ventas agendadas", color: "#1479c4", bg: "#dbeafe", icon: "📦" },
  nota: { label: "Nota", color: "#7c3aed", bg: "#ede9fe", icon: "📝" },
  mejora: { label: "Asunto por hacer", color: "#b45309", bg: "#fef3c7", icon: "🔧" },
};
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-naranja";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const hoy = new Date();
  const [y, m] = (sp.mes ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`).split("-").map(Number);
  const anio = y || hoy.getFullYear();
  const mes = (m || hoy.getMonth() + 1) - 1; // 0-index

  const inicio = new Date(anio, mes, 1);
  const fin = new Date(anio, mes + 1, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const offset = (inicio.getDay() + 6) % 7; // lunes = 0

  const [entradas, productos, sabores, negocios, prodMes, repMes, pedMes, notasMes, mejorasMes] = await Promise.all([
    prisma.agenda.findMany({ where: { fecha: { gte: inicio, lt: fin } }, orderBy: { fecha: "asc" } }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, linea: true } }),
    prisma.negocio.findMany({ orderBy: { nombreNegocio: "asc" }, take: 300, select: { id: true, nombreNegocio: true } }),
    // Movimientos de la planta que se suman al calendario como recordatorios.
    prisma.movimientoBodega.findMany({ where: { zona: "produccion", fecha: { gte: inicio, lt: fin } }, select: { fecha: true, cantidad: true } }),
    prisma.pedidoReparto.findMany({ where: { fecha: { gte: inicio, lt: fin } }, select: { fecha: true } }),
    prisma.pedido.findMany({ where: { fechaAgenda: { gte: inicio, lt: fin } }, select: { fechaAgenda: true } }),
    prisma.nota.findMany({ where: { OR: [{ fechaObjetivo: { gte: inicio, lt: fin } }, { createdAt: { gte: inicio, lt: fin } }] }, select: { texto: true, estado: true, fechaObjetivo: true, createdAt: true } }),
    prisma.mejora.findMany({ where: { OR: [{ fechaObjetivo: { gte: inicio, lt: fin } }, { createdAt: { gte: inicio, lt: fin } }] }, select: { titulo: true, estado: true, fechaObjetivo: true, createdAt: true } }),
  ]);

  const porDia = new Map<number, typeof entradas>();
  for (const e of entradas) {
    const d = new Date(e.fecha).getDate();
    const arr: typeof entradas = porDia.get(d) ?? [];
    arr.push(e);
    porDia.set(d, arr);
  }

  // Eventos EXTRA (movimientos de la planta) por día: producción, ventas, notas, asuntos.
  type Extra = { mov: keyof typeof movMeta; titulo: string; done?: boolean };
  const extraPorDia = new Map<number, Extra[]>();
  const addExtra = (dia: number, e: Extra) => { const a = extraPorDia.get(dia) ?? []; a.push(e); extraPorDia.set(dia, a); };
  // Producción: total de unidades por día (un recordatorio por día).
  const prodDia = new Map<number, number>();
  for (const m of prodMes) prodDia.set(new Date(m.fecha).getDate(), (prodDia.get(new Date(m.fecha).getDate()) ?? 0) + m.cantidad);
  for (const [d, u] of prodDia) addExtra(d, { mov: "produccion", titulo: `${u} u. producidas` });
  // Ventas agendadas (reparto + pedidos web): conteo por día.
  const ventaDia = new Map<number, number>();
  for (const r of repMes) ventaDia.set(new Date(r.fecha).getDate(), (ventaDia.get(new Date(r.fecha).getDate()) ?? 0) + 1);
  for (const p of pedMes) if (p.fechaAgenda) ventaDia.set(new Date(p.fechaAgenda).getDate(), (ventaDia.get(new Date(p.fechaAgenda).getDate()) ?? 0) + 1);
  for (const [d, n] of ventaDia) addExtra(d, { mov: "venta", titulo: `${n} entrega(s) agendada(s)` });
  // Notas y asuntos: cada uno en su día (fechaObjetivo o creación), con su estado.
  for (const n of notasMes) addExtra(new Date(n.fechaObjetivo ?? n.createdAt).getDate(), { mov: "nota", titulo: n.texto, done: n.estado === "hecha" });
  for (const m of mejorasMes) addExtra(new Date(m.fechaObjetivo ?? m.createdAt).getDate(), { mov: "mejora", titulo: m.titulo, done: m.estado === "hecha" });

  const prevMes = new Date(anio, mes - 1, 1);
  const nextMes = new Date(anio, mes + 1, 1);
  const mesLabel = inicio.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const nombreDe = (e: (typeof entradas)[number]) => {
    if (e.productoId) return productos.find((p) => p.id === e.productoId)?.nombre ?? "";
    if (e.saborId) return sabores.find((s) => s.id === e.saborId)?.nombre ?? "";
    return "";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Agenda de la planta</h1>
          <p className="text-sm text-slate-500">Movimientos del mes: producción, ventas agendadas, notas, asuntos y lo agendado (apartar/fabricar/entregar).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/agenda?mes=${ymd(prevMes).slice(0, 7)}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold">←</Link>
          <span className="min-w-[10rem] text-center text-sm font-bold capitalize text-slate-700">{mesLabel}</span>
          <Link href={`/admin/agenda?mes=${ymd(nextMes).slice(0, 7)}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold">→</Link>
        </div>
      </div>

      {/* Calendario */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold text-slate-500">
          {DIAS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => <div key={`b${i}`} className="min-h-20 border-b border-r border-slate-100 bg-slate-50/40" />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const items = porDia.get(dia) ?? [];
            const extras = extraPorDia.get(dia) ?? [];
            const totalEventos = items.length + extras.length;
            const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth() && dia === hoy.getDate();
            return (
              <div key={dia} className="min-h-20 border-b border-r border-slate-100 p-1">
                <div className={`text-xs font-bold ${esHoy ? "inline-block rounded bg-naranja px-1.5 text-white" : "text-slate-400"}`}>{dia}</div>
                <div className="mt-0.5 space-y-0.5">
                  {items.slice(0, 2).map((e) => {
                    const t = tipoMeta[e.tipo] ?? tipoMeta.otro;
                    return (
                      <div key={e.id} className="truncate rounded px-1 py-0.5 text-[10px] font-semibold" style={{ color: t.color, backgroundColor: t.bg, opacity: e.estado === "cancelado" || e.estado === "hecho" ? 0.5 : 1 }}>
                        {e.titulo}
                      </div>
                    );
                  })}
                  {extras.slice(0, Math.max(0, 4 - Math.min(items.length, 2))).map((x, j) => {
                    const t = movMeta[x.mov];
                    return (
                      <div key={`x${j}`} className="truncate rounded px-1 py-0.5 text-[10px] font-semibold" style={{ color: t.color, backgroundColor: t.bg, opacity: x.done ? 0.5 : 1 }}>
                        {t.icon} {x.done ? "✓ " : ""}{x.titulo}
                      </div>
                    );
                  })}
                  {totalEventos > 4 && <div className="text-[10px] text-slate-400">+{totalEventos - 4} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda de colores (qué significa cada movimiento) */}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded px-2 py-0.5 font-bold" style={{ color: tipoMeta.fabricar.color, backgroundColor: tipoMeta.fabricar.bg }}>📋 Agendado</span>
        {Object.entries(movMeta).map(([k, m]) => (
          <span key={k} className="rounded px-2 py-0.5 font-bold" style={{ color: m.color, backgroundColor: m.bg }}>{m.icon} {m.label}</span>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Nuevo agendado */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-900">➕ Agendar algo</h2>
          <form action={crearAgenda} className="space-y-2">
            <input name="titulo" required placeholder="Título (ej: Surtido cumpleaños Rosa)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-600">Fecha
                <input type="date" name="fecha" required defaultValue={ymd(hoy)} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-xs font-bold text-slate-600">Tipo
                <select name="tipo" defaultValue="apartar" className={`mt-1 ${inputCls}`}>
                  <option value="apartar">Apartar en bodega</option>
                  <option value="mezclar">Mandar a mezclar</option>
                  <option value="fabricar">Mandar a fabricar</option>
                  <option value="entrega">Entrega</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600">Producto o sabor (opcional)
              <select name="objetivo" defaultValue="" className={`mt-1 ${inputCls}`}>
                <option value="">— ninguno —</option>
                <optgroup label="Productos">
                  {productos.map((p) => <option key={p.id} value={`prod:${p.id}`}>{p.nombre}</option>)}
                </optgroup>
                <optgroup label="Sabores">
                  {sabores.map((s) => <option key={s.id} value={`sab:${s.id}`}>{s.nombre} · {s.linea}</option>)}
                </optgroup>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-600">Cantidad
                <input type="number" name="cantidad" min="1" step="1" placeholder="—" className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-xs font-bold text-slate-600">Cliente (opcional)
                <select name="negocioId" defaultValue="" className={`mt-1 ${inputCls}`}>
                  <option value="">—</option>
                  {negocios.map((n) => <option key={n.id} value={n.id}>{n.nombreNegocio}</option>)}
                </select>
              </label>
            </div>
            <input name="notas" placeholder="Notas (opcional)" className={inputCls} />
            <button className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-extrabold text-white active:brightness-110">Agendar</button>
          </form>
        </section>

        {/* Lista del mes */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-900">📋 Agendado en {mesLabel}</h2>
          {entradas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada agendado este mes.</p>
          ) : (
            <ul className="space-y-2">
              {entradas.map((e) => {
                const t = tipoMeta[e.tipo] ?? tipoMeta.otro;
                const est = estadoMeta[e.estado] ?? estadoMeta.pendiente;
                const obj = nombreDe(e);
                return (
                  <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{e.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(e.fecha).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })}
                          {obj ? ` · ${obj}` : ""}{e.cantidad ? ` × ${e.cantidad}` : ""}
                        </p>
                        {e.notas && <p className="mt-0.5 text-xs text-slate-400">📝 {e.notas}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ color: t.color, backgroundColor: t.bg }}>{t.label}</span>
                        <span className="text-[10px] font-bold" style={{ color: est.color }}>{est.label}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.tipo === "fabricar" && (e.productoId || e.saborId) && e.cantidad && e.estado === "pendiente" && (
                        <form action={mandarAFabricar}><input type="hidden" name="id" value={e.id} />
                          <button className="rounded-lg bg-[#0f766e] px-3 py-1 text-xs font-bold text-white">🏭 Crear orden</button>
                        </form>
                      )}
                      {e.estado !== "hecho" && (
                        <form action={cambiarEstadoAgenda}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="estado" value="hecho" />
                          <button className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">✓ Hecho</button>
                        </form>
                      )}
                      {e.estado !== "cancelado" && (
                        <form action={cambiarEstadoAgenda}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="estado" value="cancelado" />
                          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">Cancelar</button>
                        </form>
                      )}
                      <form action={eliminarAgenda}><input type="hidden" name="id" value={e.id} />
                        <button className="rounded-lg px-3 py-1 text-xs font-bold text-red-400 hover:text-red-600">Eliminar</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
