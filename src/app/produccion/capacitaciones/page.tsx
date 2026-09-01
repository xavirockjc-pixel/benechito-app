import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { categoriaCapLabel, urlEmbed } from "@/lib/dominio/checklists";
import { marcarVista } from "@/app/admin/capacitaciones/actions";

export const dynamic = "force-dynamic";

export default async function CapacitacionesProduccion({ searchParams }: { searchParams: Promise<{ visto?: string; prod?: string }> }) {
  const { visto } = await searchParams;
  const caps = await prisma.capacitacion.findMany({
    where: { activo: true, rol: { in: ["produccion", "todos"] } },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }],
  });

  const ids = caps.map((c) => c.productoId).filter((x): x is string => !!x);
  const productos = ids.length ? await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } }) : [];
  const nombreProd = new Map(productos.map((p) => [p.id, p.nombre]));

  return (
    <div>
      <h1 className="font-display text-xl font-extrabold text-slate-900">🎓 Capacitaciones</h1>
      <p className="mb-3 text-sm text-slate-500">Aprende el paso a paso de fabricación y el uso de las máquinas.</p>
      {visto && <p className="mb-3 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">✓ Marcada como vista. ¡Bien!</p>}

      {caps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Todavía no hay capacitaciones cargadas.</p>
      ) : (
        <div className="space-y-4">
          {caps.map((c) => {
            const embed = urlEmbed(c.urlVideo);
            return (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-display text-base font-extrabold text-slate-900">{c.titulo}</p>
                <p className="text-xs text-slate-500">{categoriaCapLabel[c.categoria] ?? c.categoria}{c.productoId && nombreProd.get(c.productoId) ? ` · ${nombreProd.get(c.productoId)}` : ""}</p>
                {c.descripcion && <p className="mt-2 text-sm text-slate-600">{c.descripcion}</p>}

                {embed ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <iframe src={embed} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={c.titulo} />
                  </div>
                ) : c.urlVideo ? (
                  <a href={c.urlVideo} target="_blank" rel="noopener" className="mt-3 inline-block rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white">▶ Ver video</a>
                ) : null}

                {c.pasos && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Paso a paso</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{c.pasos}</p>
                  </div>
                )}

                <form action={marcarVista} className="mt-3">
                  <input type="hidden" name="capacitacionId" value={c.id} />
                  <input type="hidden" name="volver" value="/produccion/capacitaciones" />
                  <button className="w-full rounded-xl border border-green-300 bg-green-50 py-2 text-sm font-bold text-green-700">✓ Marcar como vista</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
