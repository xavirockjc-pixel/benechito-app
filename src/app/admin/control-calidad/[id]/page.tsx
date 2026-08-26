import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCant } from "@/lib/dominio/materias";
import { turnoLabel } from "@/lib/dominio/produccion";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Ficha de trazabilidad de un lote de producción: qué insumos entraron (base +
 * agregados por sabor), con quién y cuándo. Base para normas sanitarias y retiros.
 */
export default async function TrazabilidadLote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const control = await prisma.controlCalidad.findUnique({ where: { id } });
  if (!control) notFound();

  const [consumos, agregados] = await Promise.all([
    prisma.movimientoMateria.findMany({
      where: { referencia: id, tipo: "consumo" },
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
      orderBy: { fecha: "asc" },
    }),
    prisma.agregadoUso.findMany({ where: { controlId: id }, orderBy: { fecha: "asc" } }),
  ]);

  // Agrupa agregados por sabor.
  const porSabor = new Map<string, typeof agregados>();
  for (const a of agregados) {
    const k = a.sabor ?? "—";
    if (!porSabor.has(k)) porSabor.set(k, []);
    porSabor.get(k)!.push(a);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/control-calidad" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Control de calidad</Link>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-extrabold text-white">Lote {control.lote ?? "—"}</span>
          <h1 className="text-xl font-extrabold text-slate-900">{control.nombre}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          📅 {fmtFecha(control.fecha)}
          {control.turno ? ` · Turno ${turnoLabel[control.turno] ?? control.turno}` : ""}
          {control.operarios ? ` · 👷 ${control.operarios}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {control.base ? <span className="rounded bg-teal-50 px-2 py-1 font-semibold text-teal-700">Base: {control.base} {control.baseUnidad ?? ""}</span> : null}
          {control.cantidad > 0 ? <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-600">Salieron: {control.cantidad} u.</span> : null}
        </div>
        {control.observaciones && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📝 {control.observaciones}</p>}
      </div>

      {/* Insumos que entraron a este lote */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">🧪 Insumos usados en este lote</h2>
      {consumos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
          Sin consumos registrados para este lote.
        </p>
      ) : (
        <ul className="space-y-1">
          {consumos.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0 truncate">
                <b className="text-amber-700">−{fmtCant(Math.abs(c.cantidad), c.materiaPrima.unidad)}</b>{" "}
                <span className="text-slate-800">{c.materiaPrima.nombre}</span>
                {c.motivo ? <span className="text-xs text-slate-400"> · {c.motivo}</span> : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Agregados por sabor */}
      {porSabor.size > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">🍦 Sabores y agregados</h2>
          <div className="space-y-2">
            {[...porSabor.entries()].map(([sabor, items]) => (
              <div key={sabor} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="font-bold text-slate-800">{sabor}</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {items.map((a) => (
                    <li key={a.id} className="flex justify-between">
                      <span className="text-slate-700">{a.nombreInsumo}</span>
                      <b className="text-slate-800">{fmtCant(a.cantidad, a.unidad)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
        💡 Para trazabilidad completa hacia el cliente, registra el lote del proveedor en cada
        entrada de insumo (Materias primas → ➕ Entrada) y, más adelante, el lote de producción
        en la venta/despacho.
      </p>
    </div>
  );
}
