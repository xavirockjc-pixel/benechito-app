import { prisma } from "@/lib/prisma";
import { fmtCant, subtipoLabel, subtipoIcono, stockBajo } from "@/lib/dominio/materias";

export const dynamic = "force-dynamic";

// Orden de los grupos: lo que usa el operario para sabores/colores primero; las bases al final.
const ORDEN = ["esencia", "colorante", "otro", "base"];

/**
 * Insumos disponibles para hacer bases y sabores (vista del operario): esencias,
 * colorantes y polvos (dextrosa, estabilizante…) con su stock. Solo para ver lo que
 * hay; si falta algo, se le avisa a bodega. No muestra costos.
 */
export default async function ProduccionInsumos() {
  const materiales = await prisma.materiaPrima.findMany({
    where: { activo: true, categoria: "insumo" },
    orderBy: [{ subtipo: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, unidad: true, subtipo: true, stock: true, stockMinimo: true },
  });

  const grupos = ORDEN
    .map((s) => ({ sub: s, items: materiales.filter((m) => m.subtipo === s) }))
    .filter((g) => g.items.length > 0);
  // Subtipos que no estén en el orden conocido (por si acaso).
  const otros = materiales.filter((m) => !ORDEN.includes(m.subtipo));
  if (otros.length) grupos.push({ sub: "otro", items: otros });

  const bajos = materiales.filter((m) => stockBajo(m.stock, m.stockMinimo));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧴 Insumos disponibles</h1>
        <p className="text-xs text-slate-500">Esencias, colores y polvos para hacer las bases y los sabores. Esto es lo que hay en bodega.</p>
      </div>

      {bajos.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ <b>Por acabarse:</b> {bajos.map((m) => m.nombre).join(", ")}. Avisa a bodega.
        </div>
      )}

      {materiales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay insumos cargados. Se cargan desde Bodega → Insumos.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.sub} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-extrabold text-slate-900">{subtipoIcono[g.sub] ?? "🧪"} {subtipoLabel[g.sub] ?? g.sub}</h2>
            <ul className="divide-y divide-slate-100">
              {g.items.map((m) => {
                const bajo = stockBajo(m.stock, m.stockMinimo);
                return (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <span className={`${m.stock <= 0 ? "text-slate-400 line-through" : "text-slate-800"}`}>{m.nombre}</span>
                    <span className={`font-bold ${m.stock <= 0 ? "text-slate-400" : bajo ? "text-red-600" : "text-slate-900"}`}>
                      {m.stock <= 0 ? "agotado" : fmtCant(m.stock, m.unidad)}{bajo && m.stock > 0 ? " ⚠" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">
        💡 Solo para ver lo disponible. El ingreso y la baja de insumos se maneja en la app <b>Bodega → Insumos</b> (por voz o a mano).
      </p>
    </div>
  );
}
