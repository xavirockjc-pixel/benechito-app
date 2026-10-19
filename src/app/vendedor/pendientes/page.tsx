import { prisma } from "@/lib/prisma";
import MicDictado from "@/components/MicDictado";
import { crearPendienteRapido, entregarPedidoReparto, borrarPedidoReparto } from "../actions";

export const dynamic = "force-dynamic";

type Fila = {
  id: string; pedido: string; cliente: string | null; telefono: string | null;
  sector: string | null; fecha: Date; monto: unknown;
};

const SECTORES_BASE = ["Coronel", "Lota"];

function diaCero(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function mismoDia(a: Date, b: Date) { return diaCero(a).getTime() === diaCero(b).getTime(); }
const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

export default async function Pendientes() {
  const hoy = diaCero(new Date());
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

  const filas = (await prisma.pedidoReparto.findMany({
    where: { estado: { in: ["pendiente", "en_ruta"] } },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: { id: true, pedido: true, cliente: true, telefono: true, sector: true, fecha: true, monto: true },
    take: 300,
  })) as Fila[];

  const atrasados = filas.filter((f) => diaCero(f.fecha) < hoy);
  const deHoy = filas.filter((f) => mismoDia(f.fecha, hoy));
  const proximos = filas.filter((f) => diaCero(f.fecha) >= manana);

  // Sectores sugeridos (los ya usados + base).
  const sectoresUsados = [...new Set(filas.map((f) => (f.sector ?? "").trim()).filter(Boolean))];
  const sugerencias = [...new Set([...SECTORES_BASE, ...sectoresUsados])];

  // Agrupa una lista por sector (para escanear por zona).
  const porSector = (lista: Fila[]) => {
    const m = new Map<string, Fila[]>();
    for (const f of lista) {
      const s = (f.sector ?? "").trim() || "Sin sector";
      (m.get(s) ?? m.set(s, []).get(s)!).push(f);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  const renderItem = (f: Fila, resaltar?: boolean) => (
    <li key={f.id} className={`rounded-xl border bg-white p-2.5 shadow-sm ${resaltar ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{f.pedido}</p>
          <p className="text-xs text-slate-500">
            {f.cliente ? f.cliente : "—"}
            {f.sector ? ` · 📍 ${f.sector}` : ""}
            {` · ${diaCero(f.fecha) < hoy ? "⚠️ " : ""}${fmtFecha(f.fecha)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {f.telefono && (
            <a href={`https://wa.me/${f.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-100 px-2 py-1.5 text-xs font-bold text-green-700">💬</a>
          )}
          <form action={entregarPedidoReparto}>
            <input type="hidden" name="id" value={f.id} />
            <button className="rounded-lg bg-[#0f766e] px-2.5 py-1.5 text-xs font-extrabold text-white active:scale-95">✅ Entregado</button>
          </form>
          <form action={borrarPedidoReparto}>
            <input type="hidden" name="id" value={f.id} />
            <button className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-rose-500" title="Quitar">✕</button>
          </form>
        </div>
      </div>
    </li>
  );

  const renderGrupo = (lista: Fila[], resaltar?: boolean) => (
    <div className="space-y-3">
      {porSector(lista).map(([sec, items]) => (
        <div key={sec}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">📍 {sec} · {items.length}</p>
          <ul className="space-y-1.5">{items.map((f) => renderItem(f, resaltar))}</ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🔔 Anotar pedidos</h1>
        <p className="text-xs text-slate-500">Anota rápido (por voz), por sector, y tiquéalo al entregar. Para que no se te pase ninguno.</p>
      </div>

      {/* Captura rápida */}
      <form action={crearPendienteRapido} className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-800">➕ Nuevo pedido</p>
          <MicDictado etiqueta="🎤 Dictar" />
        </div>
        <textarea name="pedido" required rows={2} placeholder="Qué pidió (ej: 50 tú y yo + 20 paletas de agua)…"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
        <div className="grid grid-cols-2 gap-2">
          <input name="sector" list="sectores" placeholder="Sector (Lota, Coronel…)"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
          <input type="date" name="fecha" defaultValue={new Date().toLocaleDateString("en-CA")} min={new Date().toLocaleDateString("en-CA")}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
          <datalist id="sectores">{sugerencias.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="cliente" placeholder="Cliente (opcional)"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
          <input name="telefono" inputMode="tel" placeholder="WhatsApp (opcional)"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
        </div>
        <p className="text-[11px] text-slate-400">Déjalo con la fecha de HOY y te avisa al tiro. Si es para otro día, elige la fecha y te lo recuerda ese día. 🎤 Toca «Dictar» y habla.</p>
        <button className="w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:scale-95">➕ Anotar pedido</button>
      </form>

      {/* Atrasados (no se entregaron) */}
      {atrasados.length > 0 && (
        <section>
          <h2 className="mb-2 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-extrabold text-rose-700">⚠️ Atrasados ({atrasados.length}) — ¡revísalos!</h2>
          {renderGrupo(atrasados, true)}
        </section>
      )}

      {/* Para hoy */}
      <section>
        <h2 className="mb-2 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-800">🔴 Para HOY ({deHoy.length})</h2>
        {deHoy.length === 0
          ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">No hay pedidos para hoy.</p>
          : renderGrupo(deHoy)}
      </section>

      {/* Próximos días */}
      {proximos.length > 0 && (
        <section>
          <h2 className="mb-2 rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-extrabold text-sky-800">📅 Próximos días ({proximos.length})</h2>
          {renderGrupo(proximos)}
        </section>
      )}
    </div>
  );
}
