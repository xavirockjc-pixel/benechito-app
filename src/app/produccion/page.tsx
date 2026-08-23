import { prisma } from "@/lib/prisma";
import ProduccionForm from "./ProduccionForm";
import { cumplirOrden, enviarReporteTurno } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const lineaLabel: Record<string, string> = { trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", paleta: "Paletas", postre: "Postres" };

export default async function ProduccionHome({ searchParams }: { searchParams: Promise<{ ok?: string; reporte?: string }> }) {
  const { ok, reporte } = await searchParams;

  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  if (!bodega) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Producción</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay una bodega configurada. Créala en el panel (Inventario → Ubicaciones).
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [sabores, ordenes, registroHoy] = await Promise.all([
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.ordenProduccion.findMany({
      where: { estado: { in: ["planificada", "en_proceso"] } },
      include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true, linea: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" }, orderBy: { fecha: "desc" }, take: 100 }),
  ]);

  const totalHoy = registroHoy.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción</h1>
        <p className="text-xs text-slate-500">Cumple las órdenes o anota lo que fabricaste por tu cuenta.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Producción registrada</p>}
      {reporte && <p className="rounded-xl bg-teal-100 px-4 py-3 text-center text-sm font-bold text-teal-700">✓ Reporte del turno enviado</p>}

      {/* Órdenes que le enviaron */}
      {ordenes.length > 0 && (
        <section className="rounded-2xl border border-teal-300 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold text-teal-800">📋 Órdenes pendientes ({ordenes.length})</h2>
          <ul className="space-y-2">
            {ordenes.map((o) => {
              const nombre = o.saborId
                ? `${o.sabor?.nombre ?? ""} · ${lineaLabel[o.sabor?.linea ?? ""] ?? o.sabor?.linea ?? ""}`
                : o.producto?.nombre ?? "Producto";
              return (
                <li key={o.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{nombre}</span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">Hacer {o.cantidadPlan}</span>
                  </div>
                  {o.notas && <p className="mt-0.5 text-xs text-slate-500">📝 {o.notas}</p>}
                  <form action={cumplirOrden} className="mt-2 flex items-end gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="text-xs font-bold text-slate-600">Hice
                      <input type="number" name="cantidadReal" min="0" step="1" defaultValue={o.cantidadPlan} inputMode="numeric"
                        className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-slate-600">Merma
                      <input type="number" name="merma" min="0" step="1" defaultValue="0" inputMode="numeric"
                        className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                    </label>
                    <button className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white active:brightness-95">Cumplir</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Producción libre (sin orden) */}
      <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-teal-800">➕ Producción sin orden</h2>
        <ProduccionForm sabores={sabores.map((s) => ({ id: s.id, nombre: s.nombre, linea: s.linea }))} />
      </section>

      {/* Reporte del turno */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Producido hoy</h2>
          {totalHoy > 0 && <span className="text-xs font-semibold text-slate-400">{totalHoy} u.</span>}
        </div>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras producción hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registroHoy.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0">
                  <span className="font-bold text-teal-700">+{m.cantidad}</span>{" "}
                  <span className="text-slate-800">{m.nombre}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {registroHoy.length > 0 && (
          <form action={enviarReporteTurno} className="mt-3">
            <button className="w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white active:brightness-110">
              ✅ Enviar reporte del turno
            </button>
          </form>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo del día. Los totales y las ventas del mes se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
