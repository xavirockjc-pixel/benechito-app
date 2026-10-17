import Link from "next/link";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { borrarClienteParticular, agendarSector } from "../actions";
import AgregarParticular from "./AgregarParticular";
import AvisarSectorClientes from "./AvisarSectorClientes";

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

export default async function AvisarSector({ searchParams }: { searchParams: Promise<{ sector?: string; dia?: string; ag?: string }> }) {
  const { sector = "", dia: diaParam = "", ag } = await searchParams;
  // Día por defecto = mañana (preparar la ruta del día siguiente).
  const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("en-CA"); })();
  const dia = diaParam || manana;

  const [negocios, particulares] = await Promise.all([
    prisma.negocio.findMany({ select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, sector: true, comuna: true, portalToken: true, latitud: true, longitud: true } }),
    prisma.clienteParticular.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  // Quién ya está agendado para ese día (para marcar "en la ruta").
  const d0 = new Date(dia + "T00:00:00"); const d1 = new Date(d0.getTime() + 86400000);
  const yaRuta = await prisma.pedidoReparto.findMany({
    where: { fecha: { gte: d0, lt: d1 }, estado: { in: ["pendiente", "en_ruta"] } },
    select: { id: true, negocioId: true, telefono: true },
  });
  const rutaPorNeg = new Map(yaRuta.filter((r) => r.negocioId).map((r) => [r.negocioId!, r.id]));
  const rutaPorTel = new Map(yaRuta.filter((r) => r.telefono).map((r) => [(r.telefono ?? "").replace(/\D/g, ""), r.id]));

  const sectores = [...new Set([
    ...negocios.flatMap((n) => [n.sector, n.comuna]),
    ...particulares.map((p) => p.sector),
  ].filter((x): x is string => !!x))].sort();

  const low = sector.toLowerCase();
  const negSector = sector ? negocios.filter((n) => (n.sector ?? "").toLowerCase() === low || (n.comuna ?? "").toLowerCase() === low) : [];
  const partSector = sector ? particulares.filter((p) => (p.sector ?? "").toLowerCase() === low) : [];
  const diaTxt = diaTexto(dia);

  // Catálogo personalizado por negocio (genera token a los del sector si falta).
  type Cli = { id: string; nombre: string; tel: string | null; catalogo: string; tipo: "Negocio" | "Particular"; negocioId: string | null; lat: number | null; lng: number | null; enRuta: boolean; pedidoId: string | null };
  const clientes: Cli[] = [];
  for (const n of negSector) {
    let token = n.portalToken;
    if (!token) {
      token = randomBytes(12).toString("hex");
      await prisma.negocio.update({ where: { id: n.id }, data: { portalToken: token } }).catch(() => { token = null; });
    }
    const pedidoId = rutaPorNeg.get(n.id) ?? null;
    clientes.push({ id: `n-${n.id}`, nombre: n.nombreNegocio || n.nombreContacto || "Cliente", tel: n.whatsapp, catalogo: token ? `${CATALOGO}?c=${token}` : CATALOGO, tipo: "Negocio", negocioId: n.id, lat: n.latitud ?? null, lng: n.longitud ?? null, enRuta: !!pedidoId, pedidoId });
  }
  for (const p of partSector) {
    const tel = (p.telefono ?? "").replace(/\D/g, "");
    const pedidoId = tel ? rutaPorTel.get(tel) ?? null : null;
    clientes.push({ id: `p-${p.id}`, nombre: p.nombre, tel: p.telefono, catalogo: CATALOGO, tipo: "Particular", negocioId: null, lat: p.lat ?? null, lng: p.lng ?? null, enRuta: !!pedidoId, pedidoId });
  }

  const enRutaCount = clientes.filter((c) => c.enRuta).length;
  const totalClientes = negocios.length + particulares.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/vendedor/pedidos" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">←</Link>
        <h1 className="text-xl font-extrabold text-slate-900">👥 Clientes por sector</h1>
      </div>
      <p className="text-xs text-slate-500">Centralizado de clientes (negocios + particulares). Busca por sector y mándales catálogo, promos o avisa que pasas. Total: {totalClientes}.</p>

      {/* Agregar particular fácil */}
      <AgregarParticular sectores={sectores} />

      {/* Buscar por sector + día */}
      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-bold text-slate-900">🔎 Buscar por sector</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">Sector
            <input name="sector" defaultValue={sector} list="sectores" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <datalist id="sectores">{sectores.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label className="text-xs font-bold text-slate-600">Día (para “pasamos”)
            <input type="date" name="dia" defaultValue={dia} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-2 w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white">Ver clientes del sector</button>
      </form>

      {ag != null && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">{Number(ag) > 0 ? `✓ ${ag} agendados en la ruta de ${diaTxt}` : "Ya estaban todos agendados ese día"}</p>}

      {sector && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">“{sector}” ({clientes.length}) · {diaTxt}</h2>
            {clientes.length > 0 && (
              <form action={agendarSector}>
                <input type="hidden" name="sector" value={sector} />
                <input type="hidden" name="dia" value={dia} />
                <button className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white">📅 Agendar a todos</button>
              </form>
            )}
          </div>
          <p className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>{enRutaCount} en la ruta de {diaTxt}</span>
            <Link href="/vendedor/pedidos" className="font-bold text-[#1479c4]">Ver ruta →</Link>
          </p>
          <AvisarSectorClientes clientes={clientes} dia={diaTxt} diaIso={dia} />
        </section>
      )}

      {/* Centralizado de particulares */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">📇 Particulares ({particulares.length})</h2>
        {particulares.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay clientes particulares. Agrégalos arriba.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {particulares.slice(0, 60).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="text-slate-800">{p.nombre}</span>
                  <span className="block text-[11px] text-slate-400">
                    {p.sector ?? "sin sector"}{p.telefono ? ` · ${p.telefono}` : ""}{p.lat != null ? " · 📍" : ""}
                    {p.fechaEntrega ? ` · entrega ${new Date(p.fechaEntrega).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}` : ""}
                  </span>
                </span>
                <form action={borrarClienteParticular}><input type="hidden" name="id" value={p.id} /><button className="text-xs font-bold text-rose-400">✕</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
