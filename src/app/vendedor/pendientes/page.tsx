import { prisma } from "@/lib/prisma";
import { entregarPedidoReparto, borrarPedidoReparto } from "../actions";
import { linkMaps } from "@/lib/dominio/reparto";
import CapturaRapida from "./CapturaRapida";
import RecordatorioAlarma from "./RecordatorioAlarma";

export const dynamic = "force-dynamic";

type Fila = {
  id: string; pedido: string; cliente: string | null; telefono: string | null;
  sector: string | null; fecha: Date; lat: number | null; lng: number | null; mapsUrl: string | null;
};

const SECTORES_BASE = ["Coronel", "Lota"];

function diaCero(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function mismoDia(a: Date, b: Date) { return diaCero(a).getTime() === diaCero(b).getTime(); }
const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

export default async function Pendientes({ searchParams }: { searchParams: Promise<{ text?: string; url?: string; title?: string }> }) {
  // Si llega "compartido" desde WhatsApp/Maps (Share Target del PWA), precarga el texto.
  const sp = await searchParams;
  const compartido = [sp.title, sp.text, sp.url].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  const hoy = diaCero(new Date());
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

  const filas = (await prisma.pedidoReparto.findMany({
    where: { estado: { in: ["pendiente", "en_ruta"] } },
    orderBy: [{ fecha: "asc" }, { orden: "asc" }],
    select: { id: true, pedido: true, cliente: true, telefono: true, sector: true, fecha: true, lat: true, lng: true, mapsUrl: true },
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
          {linkMaps(f) && (
            <a href={linkMaps(f)!} target="_blank" rel="noreferrer" className="rounded-lg bg-sky-100 px-2 py-1.5 text-xs font-bold text-sky-700" title="Ubicación">📍</a>
          )}
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
        <p className="text-xs text-slate-500">Anota rápido (por voz o compartiendo), por sector, y tiquéalo al entregar. Para que no se te pase ninguno.</p>
      </div>

      {/* Alarma: recuerda cada cierto rato los pedidos de HOY sin entregar */}
      <RecordatorioAlarma urgentes={atrasados.length + deHoy.length} />

      {/* Captura rápida: pega o comparte el WhatsApp y se completa solo */}
      <CapturaRapida sugerencias={sugerencias} initial={compartido} />

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
