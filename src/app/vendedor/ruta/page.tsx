import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { estadoParadaLabel, estadoParadaColor } from "@/lib/dominio/ruta";
import { marcarParada } from "@/app/admin/rutas/actions";
import RutaSugerida from "./RutaSugerida";

export const dynamic = "force-dynamic";

export default async function RutaPage() {
  const u = await usuarioActual();

  // Ruta asignada activa del vendedor (planificada o en curso), la más reciente.
  const ruta = u
    ? await prisma.ruta.findFirst({
        where: { vendedorId: u.sub, estado: { in: ["planificada", "en_curso"] } },
        orderBy: { fecha: "desc" },
        include: {
          paradas: {
            orderBy: { orden: "asc" },
            include: { negocio: { select: { id: true, nombreNegocio: true, comuna: true, latitud: true, longitud: true } } },
          },
        },
      })
    : null;

  // Si hay ruta asignada, la mostramos. Si no, la sugerida por cercanía.
  if (ruta && ruta.paradas.length > 0) {
    const hechas = ruta.paradas.filter((p) => p.estado !== "pendiente").length;
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Mi ruta{ruta.nombre ? `: ${ruta.nombre}` : ""}</h1>
        <p className="text-sm text-slate-500">{hechas}/{ruta.paradas.length} paradas hechas</p>

        <ol className="mt-4 space-y-2">
          {ruta.paradas.map((p, i) => {
            const c = estadoParadaColor[p.estado];
            const n = p.negocio;
            return (
              <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1479c4] text-sm font-extrabold text-white">{i + 1}</span>
                  <Link href={`/vendedor/cliente/${n.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{n.nombreNegocio}</span>
                    <span className="block truncate text-xs text-slate-500">{n.comuna}</span>
                  </Link>
                  <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
                    {estadoParadaLabel[p.estado] ?? p.estado}
                  </span>
                  {n.latitud && n.longitud && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${n.latitud},${n.longitud}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      Ir
                    </a>
                  )}
                </div>
                {/* Marcar resultado rápido */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(["vendido", "no_compro", "no_estaba"] as const).map((estado) => (
                    <form key={estado} action={marcarParada}>
                      <input type="hidden" name="paradaId" value={p.id} />
                      <input type="hidden" name="estado" value={estado} />
                      <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 active:bg-slate-50">
                        {estadoParadaLabel[estado]}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-5 text-center text-xs text-slate-400">Toca un cliente para vender o cobrar.</p>
      </div>
    );
  }

  // Fallback: sin ruta asignada → sugerir por cercanía.
  const clientes = await prisma.negocio.findMany({
    orderBy: { nombreNegocio: "asc" },
    include: { ventas: { select: { total: true, pagos: { select: { monto: true } } } } },
  });
  const conUbicacion = clientes
    .filter((c) => c.latitud != null && c.longitud != null)
    .map((c) => ({
      id: c.id,
      nombre: c.nombreNegocio,
      direccion: c.direccion,
      comuna: c.comuna,
      lat: c.latitud as number,
      lng: c.longitud as number,
      saldo: c.ventas.reduce((s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)), 0),
    }));
  const sinUbicacion = clientes.filter((c) => c.latitud == null || c.longitud == null).length;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">Ruta sugerida</h1>
      <p className="text-sm text-slate-500">No tienes ruta asignada hoy. Te sugiero por cercanía.</p>
      <div className="mt-3">
        <RutaSugerida clientes={conUbicacion} />
      </div>
      {sinUbicacion > 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
          {sinUbicacion} cliente(s) sin ubicación no entran en la ruta.
        </p>
      )}
    </div>
  );
}
