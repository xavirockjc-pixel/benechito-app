import Link from "next/link";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { crearClienteParticular, borrarClienteParticular, agendarSector } from "../actions";

export const dynamic = "force-dynamic";

const CATALOGO = "https://benechito.com/tienda";

function diaTexto(iso: string): string {
  const d = new Date(iso + "T08:00:00");
  if (isNaN(d.getTime())) return "pronto";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - hoy.getTime()) / 86400000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
}

function waLink(tel: string | null, nombre: string, dia: string, catalogo: string) {
  const hola = nombre ? `Hola ${nombre}! ` : "Hola! ";
  const msg = `${hola}👋 ${dia.charAt(0).toUpperCase() + dia.slice(1)} pasamos por tu sector con Benechito 🛵🍦.\n¿Quieres agendar tu pedido? Mira el catálogo aquí 👉 ${catalogo}\nRespóndeme con lo que llevas y te lo dejo. ¡Gracias! 🍦`;
  const t = (tel ?? "").replace(/\D/g, "");
  return t ? `https://wa.me/${t}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export default async function AvisarSector({ searchParams }: { searchParams: Promise<{ sector?: string; dia?: string; ag?: string }> }) {
  const { sector = "", dia = "", ag } = await searchParams;

  const [negocios, particulares] = await Promise.all([
    prisma.negocio.findMany({ select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, sector: true, comuna: true, portalToken: true } }),
    prisma.clienteParticular.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  // Sectores disponibles (de negocios y particulares).
  const sectores = [...new Set([
    ...negocios.flatMap((n) => [n.sector, n.comuna]),
    ...particulares.map((p) => p.sector),
  ].filter((x): x is string => !!x))].sort();

  const low = sector.toLowerCase();
  const negSector = sector
    ? negocios.filter((n) => (n.sector ?? "").toLowerCase() === low || (n.comuna ?? "").toLowerCase() === low)
    : [];
  const partSector = sector
    ? particulares.filter((p) => (p.sector ?? "").toLowerCase() === low)
    : [];
  const diaTxt = diaTexto(dia);

  // Catálogo PERSONALIZADO por negocio (su portal → el pedido vuelve asociado).
  // Genera el token a los del sector que no lo tengan (solo esos, acotado).
  const catalogoDe = new Map<string, string>();
  for (const n of negSector) {
    let token = n.portalToken;
    if (!token) {
      token = randomBytes(12).toString("hex");
      await prisma.negocio.update({ where: { id: n.id }, data: { portalToken: token } }).catch(() => { token = null; });
    }
    catalogoDe.set(n.id, token ? `${CATALOGO}?c=${token}` : CATALOGO);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/vendedor/pedidos" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">←</Link>
        <h1 className="text-xl font-extrabold text-slate-900">📣 Avisar a un sector</h1>
      </div>
      <p className="text-xs text-slate-500">Elige el sector y el día; a cada cliente le mandas un WhatsApp con el catálogo para que agende.</p>

      {/* Elegir sector + día */}
      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">Sector
            <input name="sector" defaultValue={sector} list="sectores" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <datalist id="sectores">{sectores.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label className="text-xs font-bold text-slate-600">Día
            <input type="date" name="dia" defaultValue={dia} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-2 w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white">Ver clientes del sector</button>
      </form>

      {ag != null && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">{Number(ag) > 0 ? `✓ ${ag} agendados en la ruta de ${diaTxt}` : "Ya estaban todos agendados ese día"}</p>}

      {sector && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Clientes en “{sector}” ({negSector.length + partSector.length}) · {diaTxt}</h2>
            {negSector.length + partSector.length > 0 && dia && (
              <form action={agendarSector}>
                <input type="hidden" name="sector" value={sector} />
                <input type="hidden" name="dia" value={dia} />
                <button className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white">📅 Agendar a todos</button>
              </form>
            )}
          </div>
          {negSector.length + partSector.length === 0 ? (
            <p className="text-sm text-slate-500">No hay clientes en ese sector todavía.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {negSector.map((n) => {
                const nom = n.nombreNegocio || n.nombreContacto || "Cliente";
                return (
                  <li key={`n-${n.id}`} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0"><span className="text-sm font-semibold text-slate-800">{nom}</span><span className="block text-[11px] text-slate-400">Negocio{n.whatsapp ? "" : " · sin WhatsApp"}</span></span>
                    <a href={waLink(n.whatsapp, nom, diaTxt, catalogoDe.get(n.id) ?? CATALOGO)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">💬 Avisar</a>
                  </li>
                );
              })}
              {partSector.map((p) => (
                <li key={`p-${p.id}`} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0"><span className="text-sm font-semibold text-slate-800">{p.nombre}</span><span className="block text-[11px] text-slate-400">Particular{p.telefono ? "" : " · sin WhatsApp"}</span></span>
                  <a href={waLink(p.telefono, p.nombre, diaTxt, CATALOGO)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">💬 Avisar</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Agregar particular */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">➕ Agregar cliente particular</h2>
        <form action={crearClienteParticular} className="space-y-2">
          <input name="nombre" placeholder="Nombre" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="telefono" inputMode="tel" placeholder="WhatsApp (569…)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="sector" list="sectores" placeholder="Sector" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button className="w-full rounded-xl bg-[#0f766e] py-2 text-sm font-bold text-white">Guardar</button>
        </form>
        {particulares.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {particulares.slice(0, 30).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">{p.nombre} <span className="text-[11px] text-slate-400">· {p.sector ?? "sin sector"}</span></span>
                <form action={borrarClienteParticular}><input type="hidden" name="id" value={p.id} /><button className="text-xs font-bold text-rose-400">✕</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
