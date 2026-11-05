import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RUTAS, rutaDeComuna } from "@/lib/dominio/sectores";
import ArmarRuta from "./ArmarRuta";

export const dynamic = "force-dynamic";

/**
 * Armar la ruta del día: elige la ruta canónica, decide a quién pasar (todos / solo
 * los que agendaron en preventa / agregar a mano) y ordena por ubicación (cercanía).
 */
export default async function ArmarRutaPage() {
  const [negocios, agendaron] = await Promise.all([
    prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" } },
      select: { id: true, nombreNegocio: true, comuna: true, sector: true, latitud: true, longitud: true },
      take: 3000,
    }),
    // "Agendaron" = dejaron un pedido de preventa sin atender aún.
    prisma.preventa.findMany({
      where: { atendida: false, estado: "pedido" },
      orderBy: { respondidoEn: "desc" },
      select: { negocioId: true, detalle: true },
    }),
  ]);

  // Último detalle por negocio que agendó.
  const agendoDe = new Map<string, string | null>();
  for (const p of agendaron) if (!agendoDe.has(p.negocioId)) agendoDe.set(p.negocioId, p.detalle);

  const clientes = negocios.map((n) => {
    const r = rutaDeComuna(n.sector || n.comuna);
    return {
      id: n.id, nombre: n.nombreNegocio, comuna: n.comuna, rutaClave: r.clave, rutaLabel: r.label,
      lat: n.latitud ?? null, lng: n.longitud ?? null,
      agendo: agendoDe.has(n.id), detalle: agendoDe.get(n.id) ?? null,
    };
  });

  // Rutas presentes (con al menos un cliente), en orden canónico.
  const presentes = new Set(clientes.map((c) => c.rutaClave));
  const rutas = RUTAS.filter((r) => presentes.has(r.clave)).map((r) => ({ clave: r.clave, label: r.label }));
  // Rutas sueltas (comuna que no calza con ninguna ruta canónica).
  for (const c of clientes) if (!rutas.some((r) => r.clave === c.rutaClave) && c.rutaClave) {
    if (!rutas.some((r) => r.clave === c.rutaClave)) rutas.push({ clave: c.rutaClave, label: c.rutaLabel });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧭 Armar ruta del día</h1>
        <p className="text-xs text-slate-500">Elige la ruta, decide a quién pasar y ordénala por ubicación para recorrerla sin vueltas.</p>
      </div>
      {rutas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay clientes cargados.</p>
      ) : (
        <ArmarRuta clientes={clientes} rutas={rutas} />
      )}
    </div>
  );
}
