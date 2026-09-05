import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AREAS_NOTA, areaNotaLabel, areaNotaIcono,
  TIPOS_NOTA, tipoNotaLabel, tipoNotaIcono, ACCIONES_NOTA,
} from "@/lib/dominio/notas";
import { prioridadLabel, prioridadColor } from "@/lib/dominio/mejoras";
import { toggleNota, eliminarNota, aplicarAccionNota, descartarAccionNota } from "@/app/notas/actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

type SP = { area?: string; tipo?: string };

export default async function NotasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const fArea = AREAS_NOTA.includes((sp.area ?? "") as never) ? sp.area : "";
  const fTipo = TIPOS_NOTA.includes((sp.tipo ?? "") as never) ? sp.tipo : "";

  const where = { ...(fArea ? { area: fArea } : {}), ...(fTipo ? { tipo: fTipo } : {}) };
  const [notas, productos, trabajadores] = await Promise.all([
    prisma.nota.findMany({ where, orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { createdAt: "desc" }] }),
    prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  const hoyISO = new Date().toLocaleDateString("en-CA");

  const sugeridas = notas.filter((n) => n.accionEstado === "sugerida");
  const abiertas = notas.filter((n) => n.estado !== "hecha" && n.accionEstado !== "sugerida");
  const pendientes = abiertas.filter((n) => n.tipo === "tarea" || n.tipo === "recordatorio")
    .sort((a, b) => {
      const fa = a.fechaObjetivo ? new Date(a.fechaObjetivo).getTime() : Infinity;
      const fb = b.fechaObjetivo ? new Date(b.fechaObjetivo).getTime() : Infinity;
      return fa - fb;
    });
  const observaciones = abiertas.filter((n) => n.tipo === "observacion" || n.tipo === "idea");
  const hechas = notas.filter((n) => n.estado === "hecha");

  const qs = (patch: Partial<SP>) => {
    const merged = { area: fArea, tipo: fTipo, ...patch };
    const params = new URLSearchParams();
    if (merged.area) params.set("area", merged.area);
    if (merged.tipo) params.set("tipo", merged.tipo);
    const s = params.toString();
    return s ? `/admin/notas?${s}` : "/admin/notas";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📝 Notas y acciones</h1>
        <p className="text-sm text-slate-500">Lo que dicta el equipo (botón 📝) se vuelve <b>acción con un clic</b> y cae a pendientes. Alimenta el <Link href="/admin/supercerebro" className="font-semibold text-amber-600 hover:underline">🧠 Supercerebro</Link>.</p>
      </div>

      {/* Acciones sugeridas (bandeja) */}
      {sugeridas.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-3">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-amber-700">⚡ Acciones sugeridas <span className="text-amber-500">({sugeridas.length})</span></h2>
          <ul className="space-y-2">
            {sugeridas.map((n) => {
              const acc = ACCIONES_NOTA[n.accion as keyof typeof ACCIONES_NOTA] ?? ACCIONES_NOTA.ninguna;
              return (
                <li key={n.id} className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900"><span className="mr-1">{acc.icon}</span>{n.texto}</p>
                  {n.accion === "asistencia" ? (
                    <form action={aplicarAccionNota} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={n.id} />
                      <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Trabajador</span>
                        <select name="trabajadorId" defaultValue={n.productoId ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" required>
                          <option value="">— elegir —</option>
                          {trabajadores.map((w) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Día</span>
                        <input type="date" name="fecha" defaultValue={n.fechaObjetivo ? new Date(n.fechaObjetivo).toLocaleDateString("en-CA") : hoyISO} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Horas</span>
                        <input type="number" name="horas" defaultValue={n.cantidad ?? undefined} min={0} placeholder="h" className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      </label>
                      <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white active:scale-95">📅 Registrar</button>
                    </form>
                  ) : (
                    <form action={aplicarAccionNota} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={n.id} />
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">{acc.verbo}</span>
                        <input type="number" name="cantidad" defaultValue={n.cantidad ?? undefined} min={1} placeholder="cant." className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" required />
                      </label>
                      <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Producto</span>
                        <select name="productoId" defaultValue={n.productoId ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">— elegir / crear abajo —</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </label>
                      {!n.productoId && (
                        <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400">…o crear nuevo</span>
                          <input name="nuevoProducto" defaultValue={n.itemNombre ?? ""} placeholder="nombre del producto" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                        </label>
                      )}
                      <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white active:scale-95">{acc.icon} Aplicar</button>
                    </form>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{areaNotaIcono[n.area]} {areaNotaLabel[n.area]}</span>
                    <span>· {fmt(n.createdAt)}</span>
                    {n.autor && <span>· {n.autor}</span>}
                    <form action={descartarAccionNota} className="ml-auto"><input type="hidden" name="id" value={n.id} /><button className="font-semibold text-slate-400 hover:text-slate-700">Descartar acción</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Filtros */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <FiltroChip href={qs({ tipo: "" })} activo={!fTipo} label="Todos los tipos" />
          {TIPOS_NOTA.map((t) => <FiltroChip key={t} href={qs({ tipo: fTipo === t ? "" : t })} activo={fTipo === t} label={`${tipoNotaIcono[t]} ${tipoNotaLabel[t]}`} />)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FiltroChip href={qs({ area: "" })} activo={!fArea} label="Todas las áreas" />
          {AREAS_NOTA.map((a) => <FiltroChip key={a} href={qs({ area: fArea === a ? "" : a })} activo={fArea === a} label={`${areaNotaIcono[a]} ${areaNotaLabel[a]}`} />)}
        </div>
      </div>

      <Seccion titulo="📌 Pendientes" items={pendientes} vacia="Nada pendiente por ahora." conFecha />
      <Seccion titulo="👁️ Observaciones e ideas" items={observaciones} vacia="Sin observaciones abiertas." />
      <Seccion titulo="✅ Resueltas" items={hechas} vacia="Aún no hay notas resueltas." tachado />
    </div>
  );
}

function FiltroChip({ href, activo, label }: { href: string; activo: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${activo ? "border-amber-400 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{label}</Link>
  );
}

type N = {
  id: string; texto: string; tipo: string; area: string; autor: string | null;
  prioridad: string; estado: string; createdAt: Date; hechaEn: Date | null;
  accion: string; accionEstado: string; fechaObjetivo: Date | null;
};

function Seccion({ titulo, items, vacia, tachado, conFecha }: { titulo: string; items: N[]; vacia: string; tachado?: boolean; conFecha?: boolean }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo} <span className="text-slate-400">({items.length})</span></h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacia}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const venc = conFecha && n.fechaObjetivo && new Date(n.fechaObjetivo) < hoy;
            return (
              <li key={n.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <form action={toggleNota}>
                  <input type="hidden" name="id" value={n.id} />
                  <button title={n.estado === "hecha" ? "Reabrir" : "Marcar resuelta"} className="mt-0.5 text-lg leading-none">{n.estado === "hecha" ? "✅" : "⭕"}</button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold text-slate-900 ${tachado ? "line-through opacity-60" : ""}`}><span className="mr-1">{tipoNotaIcono[n.tipo]}</span>{n.texto}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{areaNotaIcono[n.area]} {areaNotaLabel[n.area]}</span>
                    {n.estado !== "hecha" && <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${prioridadColor[n.prioridad] ?? ""}`}>{prioridadLabel[n.prioridad]}</span>}
                    {n.fechaObjetivo && <span className={`text-[11px] font-semibold ${venc ? "text-rose-600" : "text-slate-500"}`}>📅 {fmtDia(n.fechaObjetivo)}{venc ? " · vencida" : ""}</span>}
                    <span className="text-[11px] text-slate-400">🕒 {fmt(n.createdAt)}</span>
                    {n.autor && <span className="text-[11px] text-slate-400">· {n.autor}</span>}
                    {n.accionEstado === "aplicada" && <span className="text-[11px] font-semibold text-emerald-600">⚡ aplicada a stock</span>}
                    {n.hechaEn && <span className="text-[11px] text-emerald-600">✓ {fmt(n.hechaEn)}</span>}
                  </div>
                </div>
                <form action={eliminarNota}><input type="hidden" name="id" value={n.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
