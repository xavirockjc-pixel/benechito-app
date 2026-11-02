import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RUTAS, rutaDeComuna } from "@/lib/dominio/sectores";
import { whatsappCentralActivo } from "@/lib/whatsapp";
import { guardarAgendaRutas, enviarPreventaRuta } from "../difundir/actions";

export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function PreventaPage({ searchParams }: { searchParams: Promise<{ guardado?: string; enviados?: string; ruta?: string }> }) {
  const sp = await searchParams;
  const central = whatsappCentralActivo();

  const [agenda, negocios] = await Promise.all([
    prisma.rutaDia.findMany(),
    prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" } },
      select: { whatsapp: true, comuna: true, sector: true },
      take: 2000,
    }),
  ]);

  // Día asignado por ruta + nº de clientes con WhatsApp por ruta.
  const diaDe = new Map(agenda.map((a) => [a.ruta, a.dia]));
  const clientesDe = new Map<string, number>();
  for (const n of negocios) {
    if (!(n.whatsapp || "").replace(/\D/g, "")) continue;
    const k = rutaDeComuna(n.sector || n.comuna).clave;
    clientesDe.set(k, (clientesDe.get(k) ?? 0) + 1);
  }

  const manana = (new Date().getDay() + 1) % 7;
  const rutasManana = RUTAS.filter((r) => diaDe.get(r.clave) === manana);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">📢 Preventa por ruta</h1>
        <p className="text-xs text-slate-500">Asigna un día a cada ruta y avisa a sus clientes el día antes para que dejen pedido.</p>
      </div>

      {sp.guardado && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Agenda guardada</p>}
      {sp.enviados && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Preventa enviada a {sp.enviados} cliente(s)</p>}

      {!central && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          ⚠️ El número Benechito no está conectado, así que el envío automático no saldrá. (Igual puedes usar el mensaje masivo uno por uno.)
        </p>
      )}

      {/* Preventa de mañana */}
      <section className="rounded-2xl border-2 border-[#1479c4]/30 bg-blue-50/40 p-4">
        <h2 className="text-sm font-extrabold text-slate-900">📅 Preventa de mañana ({DIAS[manana]})</h2>
        {rutasManana.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">No hay rutas asignadas para mañana. Asígnalas abajo.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {rutasManana.map((r) => (
              <form key={r.clave} action={enviarPreventaRuta} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 shadow-sm">
                <input type="hidden" name="ruta" value={r.clave} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800">📍 {r.label}</span>
                  <span className="text-[11px] text-slate-400">{clientesDe.get(r.clave) ?? 0} clientes con WhatsApp</span>
                </span>
                <button className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-extrabold text-white active:scale-95">📢 Enviar preventa</button>
              </form>
            ))}
          </div>
        )}
      </section>

      {/* Día de cada ruta (agenda) */}
      <form action={guardarAgendaRutas} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">🗓️ Día de cada ruta</h2>
        <p className="mb-2 text-[11px] text-slate-500">Qué día recorres cada ruta. La preventa se sugiere el día anterior.</p>
        <div className="space-y-1.5">
          {RUTAS.map((r) => (
            <label key={r.clave} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold text-slate-700">📍 {r.label} <span className="text-[11px] text-slate-400">({clientesDe.get(r.clave) ?? 0})</span></span>
              <select name={`dia_${r.clave}`} defaultValue={diaDe.has(r.clave) ? String(diaDe.get(r.clave)) : ""} className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                <option value="">— sin día —</option>
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </label>
          ))}
        </div>
        <button className="mt-3 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-extrabold text-white active:brightness-110">💾 Guardar agenda</button>
      </form>

      {/* Enviar preventa a cualquier ruta ahora */}
      <form action={enviarPreventaRuta} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">📤 Enviar preventa a una ruta ahora</h2>
        <select name="ruta" required defaultValue="" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Elige la ruta…</option>
          {RUTAS.map((r) => <option key={r.clave} value={r.clave}>📍 {r.label} ({clientesDe.get(r.clave) ?? 0})</option>)}
        </select>
        <textarea name="texto" rows={3} defaultValue="🐝 ¡Hola {nombre}! Mañana pasamos por tu sector con los helados Benechito 🍦. ¿Te dejo tu pedido? Avísame qué necesitas."
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-[#1479c4]" />
        <p className="mt-1 text-[11px] text-slate-400"><code className="rounded bg-slate-100 px-1">{"{nombre}"}</code> se reemplaza por cada cliente.</p>
        <button className="mt-2 w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:brightness-95">📢 Enviar preventa</button>
      </form>
    </div>
  );
}
