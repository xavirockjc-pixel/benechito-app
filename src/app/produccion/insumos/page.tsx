import Link from "next/link";
import { registrarAcceso } from "@/lib/dominio/accesos";
import { prisma } from "@/lib/prisma";
import { fmtCant, subtipoLabel, subtipoIcono, stockBajo, tipoMovMateriaLabel } from "@/lib/dominio/materias";
import ConteoInsumos from "./ConteoInsumos";

export const dynamic = "force-dynamic";

const ORDEN = ["esencia", "colorante", "otro", "base"];
const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/**
 * Insumos de producción: anotar cuánto queda (por selector, sin lista larga), ver el
 * stock en una ventana retráctil, y los registros por fecha. Todo enlazado al cerebro.
 */
export default async function ProduccionInsumos() {
  await registrarAcceso("produccion", "Insumos disponibles");

  const [materiales, movs] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, subtipo: true, categoria: true, stock: true, stockMinimo: true },
    }),
    prisma.movimientoMateria.findMany({
      orderBy: { fecha: "desc" }, take: 40,
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
  ]);

  const insumos = materiales.filter((m) => m.categoria === "insumo");
  const bajos = materiales.filter((m) => stockBajo(m.stock, m.stockMinimo));
  const selector = materiales.map((m) => ({ id: m.id, nombre: m.nombre, unidad: m.unidad, stock: m.stock }));

  // Agrupa el stock de insumos por subtipo (para la ventana retráctil).
  const grupos = ORDEN
    .map((s) => ({ sub: s, items: insumos.filter((m) => m.subtipo === s) }))
    .filter((g) => g.items.length > 0);
  const otros = insumos.filter((m) => !ORDEN.includes(m.subtipo));
  if (otros.length) grupos.push({ sub: "otro", items: otros });
  const materls = materiales.filter((m) => m.categoria === "material");

  // Registros agrupados por día (para la ventana "registros por fecha").
  const porFecha = new Map<string, typeof movs>();
  for (const m of movs) {
    const k = fmtFecha(m.fecha);
    (porFecha.get(k) ?? porFecha.set(k, []).get(k)!).push(m);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧴 Insumos</h1>
        <p className="text-xs text-slate-500">Anota cuánto queda de cada cosa. El cerebro lleva el control y avisa cuándo va a faltar.</p>
      </div>

      {bajos.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ <b>Por acabarse:</b> {bajos.map((m) => m.nombre).join(", ")}.
        </div>
      )}

      {/* Anotar cuánto queda (selector, no lista larga) */}
      {materiales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay insumos. Se crean en Bodega → Insumos o en el panel.
        </p>
      ) : (
        <ConteoInsumos materiales={selector} />
      )}

      <Link href="/produccion/mezclas" className="block rounded-xl bg-[#b45309] py-3 text-center text-sm font-extrabold text-white shadow active:brightness-95">
        🧪 Registrar mezclas (lo que usaste) →
      </Link>

      {/* Ventana retráctil: stock de insumos */}
      {materiales.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-700">📦 Ver stock de insumos</summary>
          <div className="space-y-3 border-t border-slate-100 p-4">
            {grupos.map((g) => (
              <div key={g.sub}>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{subtipoIcono[g.sub] ?? "🧪"} {subtipoLabel[g.sub] ?? g.sub}</h3>
                <ul className="divide-y divide-slate-100">
                  {g.items.map((m) => {
                    const bajo = stockBajo(m.stock, m.stockMinimo);
                    return (
                      <li key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className={m.stock <= 0 ? "text-slate-400 line-through" : "text-slate-800"}>{m.nombre}</span>
                        <span className={`font-bold ${m.stock <= 0 ? "text-slate-400" : bajo ? "text-red-600" : "text-slate-900"}`}>
                          {m.stock <= 0 ? "agotado" : fmtCant(m.stock, m.unidad)}{bajo && m.stock > 0 ? " ⚠" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {materls.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">📦 Materiales</h3>
                <ul className="divide-y divide-slate-100">
                  {materls.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className={m.stock <= 0 ? "text-slate-400 line-through" : "text-slate-800"}>{m.nombre}</span>
                      <span className={`font-bold ${m.stock <= 0 ? "text-slate-400" : "text-slate-900"}`}>{m.stock <= 0 ? "agotado" : fmtCant(m.stock, m.unidad)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Ventana retráctil: registros por fecha */}
      {movs.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-700">📅 Registros por fecha</summary>
          <div className="space-y-3 border-t border-slate-100 p-4">
            {[...porFecha.entries()].map(([dia, items]) => (
              <div key={dia}>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{dia}</h3>
                <ul className="space-y-1 text-sm">
                  {items.map((m) => {
                    const entra = m.tipo === "entrada" || (m.tipo === "ajuste" && m.cantidad >= 0);
                    return (
                      <li key={m.id} className="flex items-center justify-between">
                        <span className="min-w-0 truncate text-slate-700">
                          <span className={`font-bold ${entra ? "text-green-600" : "text-amber-600"}`}>{entra ? "+" : "−"}{fmtCant(Math.abs(m.cantidad), m.materiaPrima.unidad)}</span>{" "}
                          {m.materiaPrima.nombre} <span className="text-[11px] text-slate-400">· {tipoMovMateriaLabel[m.tipo] ?? m.tipo}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
