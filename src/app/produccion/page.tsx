import { prisma } from "@/lib/prisma";
import ProduccionForm from "./ProduccionForm";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function ProduccionHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

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

  const [sabores, registroHoy] = await Promise.all([
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" }, orderBy: { fecha: "desc" }, take: 100 }),
  ]);

  const totalHoy = registroHoy.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción</h1>
        <p className="text-xs text-slate-500">Anota lo fabricado por tipo y sabor. Queda como stock de sabores en bodega.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Producción registrada</p>}

      <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
        <ProduccionForm sabores={sabores.map((s) => ({ id: s.id, nombre: s.nombre, linea: s.linea }))} />
      </section>

      {/* Registro del día — sin totales de stock ni ventas del mes */}
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
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo del día. Los totales y las ventas del mes se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
