import { prisma } from "@/lib/prisma";
import { canalIcono, canalLabel, fechaCorta, estadoAgendaLabel } from "@/lib/dominio/agenda";
import { avanzarRetiro } from "./retiros-actions";

/**
 * Panel de "Pedidos de retiro para ti", reutilizable en local (caja), bodega y
 * reparto (vendedor). Muestra los retiros despachados a ese departamento y deja
 * marcarlos en preparación / listos. Contacto por WhatsApp si hay número.
 */
export default async function RetirosDepto({ destino, acento = "#0f7a44" }: { destino: string; acento?: string }) {
  const retiros = await prisma.agenda.findMany({
    where: { tipo: "retiro", destino, estado: { not: "cancelado" } },
    orderBy: [{ estado: "asc" }, { fecha: "asc" }],
    take: 40,
  });
  const activos = retiros.filter((r) => r.estado !== "hecho");
  if (retiros.length === 0) return null;

  const negIds = retiros.map((r) => r.negocioId).filter(Boolean) as string[];
  const negs = negIds.length
    ? await prisma.negocio.findMany({ where: { id: { in: negIds } }, select: { id: true, whatsapp: true, nombreContacto: true } })
    : [];
  const negById = new Map(negs.map((n) => [n.id, n]));

  return (
    <section className="mt-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        🧾 Pedidos de retiro para ti
        {activos.length > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs font-extrabold text-white" style={{ backgroundColor: acento }}>
            {activos.length}
          </span>
        )}
      </h2>

      <div className="space-y-2">
        {activos.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Nada pendiente por ahora.
          </p>
        )}
        {activos.map((r) => {
          const neg = r.negocioId ? negById.get(r.negocioId) : null;
          const wa = (neg?.whatsapp ?? "").replace(/[^0-9]/g, "");
          const msg = encodeURIComponent(
            `Hola${neg?.nombreContacto ? " " + neg.nombreContacto : ""}, soy de Benechito 🍦. Tu pedido de retiro${r.notas ? " (" + r.notas + ")" : ""} está siendo preparado. Te aviso apenas esté listo.`,
          );
          return (
            <div key={r.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-900">{r.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {fechaCorta(r.fecha)} · {canalIcono[r.canal ?? "manual"]} {canalLabel[r.canal ?? "manual"]}
                    {r.contacto ? ` · ${r.contacto}` : ""} ·{" "}
                    <span className={r.estado === "en_proceso" ? "font-bold text-amber-600" : ""}>
                      {estadoAgendaLabel[r.estado]}
                    </span>
                  </p>
                </div>
              </div>

              {r.notas && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📦 {r.notas}</p>}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:brightness-95"
                  >
                    💬 Avisar cliente
                  </a>
                ) : (
                  <span className="flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-400">
                    Sin WhatsApp
                  </span>
                )}
                {r.estado === "pendiente" ? (
                  <form action={avanzarRetiro}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="a" value="en_proceso" />
                    <button className="w-full rounded-xl py-2.5 text-sm font-bold text-white active:brightness-95" style={{ backgroundColor: acento }}>
                      🔧 Preparando
                    </button>
                  </form>
                ) : (
                  <form action={avanzarRetiro}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="a" value="hecho" />
                    <button className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:brightness-95">
                      ✅ Listo / entregado
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
