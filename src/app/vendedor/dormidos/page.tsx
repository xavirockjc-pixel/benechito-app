import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { rutaDeComuna } from "@/lib/dominio/sectores";
import { esDormido, diasEntre } from "@/lib/dominio/clientes";

export const dynamic = "force-dynamic";

/**
 * Alerta de clientes dormidos: los que compraban seguido y se quedaron callados.
 * Ranking por lo que valían (total histórico) para salir a recuperar primero a
 * los más importantes, con botón para reactivarlos por WhatsApp.
 */
export default async function DormidosPage() {
  const ahora = new Date();

  // Resumen de compras por cliente (una sola consulta agregada).
  const agg = await prisma.venta.groupBy({
    by: ["negocioId"],
    _count: { _all: true },
    _max: { fecha: true },
    _min: { fecha: true },
    _sum: { total: true },
  });
  const dormidosAgg = agg.filter((a) => esDormido(a._min.fecha, a._max.fecha, a._count._all, ahora));

  const negocios = dormidosAgg.length
    ? await prisma.negocio.findMany({
        where: { id: { in: dormidosAgg.map((a) => a.negocioId) }, nombreNegocio: { not: "Consumidor Final" } },
        select: { id: true, nombreNegocio: true, nombreContacto: true, comuna: true, sector: true, whatsapp: true },
      })
    : [];
  const negById = new Map(negocios.map((n) => [n.id, n]));

  const filas = dormidosAgg
    .map((a) => {
      const n = negById.get(a.negocioId);
      if (!n) return null;
      return {
        id: n.id, nombre: n.nombreNegocio, contacto: n.nombreContacto, comuna: n.comuna,
        ruta: rutaDeComuna(n.sector || n.comuna).label, whatsapp: (n.whatsapp || "").replace(/\D/g, ""),
        diasSin: a._max.fecha ? diasEntre(a._max.fecha, ahora) : 0,
        total: Number(a._sum.total ?? 0), nCompras: a._count._all,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.total - a.total);

  const msg = (nombre: string | null) => encodeURIComponent(
    `🐝 ¡Hola${nombre ? " " + (nombre.split(" ")[0]) : ""}! Te extrañamos en Benechito 🍦. ¿Te repongo helados esta semana? Tengo novedades para ti 😊`,
  );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">💤 Clientes dormidos</h1>
        <p className="text-xs text-slate-500">Compraban seguido y se quedaron callados. Sal a recuperarlos, de los más valiosos primero.</p>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">🎉 Nadie dormido por ahora. Tus clientes están comprando al día.</p>
      ) : (
        <>
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm font-bold text-amber-800">{filas.length} cliente{filas.length > 1 ? "s" : ""} para recuperar</div>
          <ol className="space-y-2">
            {filas.map((f, i) => (
              <li key={f.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">{i + 1}</span>
                  <Link href={`/vendedor/cliente/${f.id}/historial`} className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{f.nombre}</span>
                    <span className="block truncate text-[11px] text-slate-400">📍 {f.ruta} · {f.nCompras} compras · {fmtCLP(f.total)}</span>
                  </Link>
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">hace {f.diasSin} días</span>
                </div>
                {f.whatsapp && (
                  <a href={`https://wa.me/${f.whatsapp}?text=${msg(f.contacto)}`} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-lg bg-green-600 py-2 text-center text-xs font-bold text-white active:brightness-95">💬 Reactivar por WhatsApp</a>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
