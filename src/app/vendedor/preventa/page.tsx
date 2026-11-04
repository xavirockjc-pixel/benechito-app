import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RUTAS, rutaDeComuna } from "@/lib/dominio/sectores";
import { whatsappCentralActivo } from "@/lib/whatsapp";
import { estadoPreventaLabel, estadoPreventaColor } from "@/lib/dominio/preventa";
import { guardarAgendaRutas, enviarPreventaRuta, enviarPreventaCliente, marcarPreventaAtendida } from "../difundir/actions";

export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const fmtHora = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function PreventaPage({ searchParams }: { searchParams: Promise<{ guardado?: string; enviados?: string; ruta?: string; vista?: string; uno?: string; sintel?: string }> }) {
  const sp = await searchParams;
  const central = whatsappCentralActivo();
  const rutaSel = (sp.ruta ?? "").trim();
  const mapa = sp.vista === "mapa";

  const [agenda, negocios, respuestas] = await Promise.all([
    prisma.rutaDia.findMany(),
    prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" } },
      select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, comuna: true, sector: true, latitud: true, longitud: true },
      take: 2000,
    }),
    // Respuestas de clientes sin atender (pidieron / pasan / etc.).
    prisma.preventa.findMany({
      where: { atendida: false, estado: { notIn: ["enviada", "sin_respuesta"] } },
      orderBy: { respondidoEn: "desc" },
      take: 40,
      include: { negocio: { select: { id: true, nombreNegocio: true, whatsapp: true } } },
    }),
  ]);

  const diaDe = new Map(agenda.map((a) => [a.ruta, a.dia]));
  const clientesDe = new Map<string, number>();
  for (const n of negocios) {
    if (!(n.whatsapp || "").replace(/\D/g, "")) continue;
    const k = rutaDeComuna(n.sector || n.comuna).clave;
    clientesDe.set(k, (clientesDe.get(k) ?? 0) + 1);
  }

  const manana = (new Date().getDay() + 1) % 7;
  const rutasManana = RUTAS.filter((r) => diaDe.get(r.clave) === manana);

  // Clientes de la ruta seleccionada (para avisar uno a uno o ver en mapa).
  const clientesRuta = rutaSel
    ? negocios
        .filter((n) => rutaDeComuna(n.sector || n.comuna).clave === rutaSel)
        .sort((a, b) => a.nombreNegocio.localeCompare(b.nombreNegocio, "es"))
    : [];
  const rutaLabel = RUTAS.find((r) => r.clave === rutaSel)?.label ?? rutaSel;
  const conCoord = clientesRuta.filter((c) => c.latitud != null && c.longitud != null);
  const mapaTodosUrl = conCoord.length
    ? `https://www.google.com/maps/dir/${conCoord.map((c) => `${c.latitud},${c.longitud}`).join("/")}`
    : "";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">📢 Preventa por ruta</h1>
        <p className="text-xs text-slate-500">Avisa a los clientes de una ruta, ellos dejan su pedido o dicen que pasan, y aquí ves sus respuestas.</p>
      </div>

      {sp.guardado && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Agenda guardada</p>}
      {sp.enviados && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Preventa enviada a {sp.enviados} cliente(s)</p>}
      {sp.uno === "1" && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Aviso enviado</p>}
      {(sp.uno === "0" || sp.sintel) && <p className="rounded-xl bg-amber-100 px-4 py-2.5 text-center text-sm font-bold text-amber-700">⚠️ No se pudo enviar (sin WhatsApp o número no conectado)</p>}

      {!central && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          ⚠️ El número Benechito no está conectado, así que el envío automático no saldrá.
        </p>
      )}

      {/* Respuestas de clientes */}
      {respuestas.length > 0 && (
        <section className="rounded-2xl border-2 border-[#0f766e]/30 bg-emerald-50/40 p-4">
          <h2 className="text-sm font-extrabold text-slate-900">📬 Respuestas de clientes ({respuestas.length})</h2>
          <p className="mb-2 text-[11px] text-slate-500">Lo que te contestaron desde el link. Marca ✓ cuando ya lo gestionaste.</p>
          <div className="space-y-2">
            {respuestas.map((pv) => {
              const c = estadoPreventaColor[pv.estado] ?? { color: "#334155", bg: "#e2e8f0" };
              const wa = (pv.negocio.whatsapp || "").replace(/\D/g, "");
              return (
                <div key={pv.id} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{pv.negocio.nombreNegocio}</p>
                      <span className="mt-0.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ color: c.color, backgroundColor: c.bg }}>{estadoPreventaLabel[pv.estado] ?? pv.estado}</span>
                      {pv.respondidoEn && <span className="ml-2 text-[11px] text-slate-400">{fmtHora(pv.respondidoEn)}</span>}
                    </div>
                    <form action={marcarPreventaAtendida}>
                      <input type="hidden" name="id" value={pv.id} />
                      <button className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white active:scale-95">✓ Visto</button>
                    </form>
                  </div>
                  {pv.detalle && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{pv.detalle}</p>}
                  <div className="mt-2 flex gap-2">
                    {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-green-600 py-2 text-center text-xs font-bold text-white">💬 Responder</a>}
                    <Link href={`/vendedor/cliente/${pv.negocio.id}`} className="flex-1 rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-600">Ver cliente</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
                <button className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-extrabold text-white active:scale-95">📢 Avisar a todos</button>
              </form>
            ))}
          </div>
        )}
      </section>

      {/* Elige la ruta → clientes (avisar uno a uno o en mapa) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">👥 Clientes por ruta</h2>
        <p className="mb-2 text-[11px] text-slate-500">Elige la ruta y avisa a cada cliente, a todos, o ábrela en el mapa.</p>
        <div className="flex flex-wrap gap-1.5">
          {RUTAS.map((r) => (
            <Link key={r.clave} href={`/vendedor/preventa?ruta=${encodeURIComponent(r.clave)}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${rutaSel === r.clave ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>
              📍 {r.label} ({clientesDe.get(r.clave) ?? 0})
            </Link>
          ))}
        </div>

        {rutaSel && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800">📍 {rutaLabel} · {clientesRuta.length}</span>
              <div className="flex gap-1.5">
                <Link href={`/vendedor/preventa?ruta=${encodeURIComponent(rutaSel)}`} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${!mapa ? "bg-[#1479c4] text-white" : "bg-slate-100 text-slate-500"}`}>📋 Lista</Link>
                <Link href={`/vendedor/preventa?ruta=${encodeURIComponent(rutaSel)}&vista=mapa`} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${mapa ? "bg-[#1479c4] text-white" : "bg-slate-100 text-slate-500"}`}>🗺️ Mapa</Link>
              </div>
            </div>

            {/* Avisar a toda la ruta */}
            <form action={enviarPreventaRuta} className="mb-2">
              <input type="hidden" name="ruta" value={rutaSel} />
              <button className="w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:brightness-95">📢 Avisar a toda la ruta</button>
            </form>

            {mapa && mapaTodosUrl && (
              <a href={mapaTodosUrl} target="_blank" rel="noreferrer" className="mb-2 block rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-extrabold text-white active:brightness-95">
                🗺️ Abrir ruta en el mapa ({conCoord.length} con ubicación)
              </a>
            )}

            {clientesRuta.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">Sin clientes en esta ruta.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {clientesRuta.map((c) => {
                  const tel = (c.whatsapp || "").replace(/\D/g, "");
                  const tieneCoord = c.latitud != null && c.longitud != null;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{c.nombreNegocio}</span>
                        <span className="block text-[11px] text-slate-400">{c.comuna || "—"}{tel ? "" : " · sin WhatsApp"}</span>
                      </span>
                      {mapa ? (
                        tieneCoord ? (
                          <a href={`https://www.google.com/maps?q=${c.latitud},${c.longitud}`} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">📍 Ver</a>
                        ) : <span className="shrink-0 text-[11px] text-slate-300">sin ubicación</span>
                      ) : (
                        <form action={enviarPreventaCliente}>
                          <input type="hidden" name="negocioId" value={c.id} />
                          <input type="hidden" name="ruta" value={rutaSel} />
                          <button disabled={!tel} className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-30">💬 Avisar</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Día de cada ruta (agenda) */}
      <form action={guardarAgendaRutas} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">🗓️ Día de cada ruta</h2>
        <p className="mb-2 text-[11px] text-slate-500">Qué día recorres cada ruta. La preventa se sugiere el día anterior y se lo decimos al cliente.</p>
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
    </div>
  );
}
