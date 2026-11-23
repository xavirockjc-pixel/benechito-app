import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setPrecioTrato } from "../actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const LUGAR: Record<string, string> = { yobilo: "🏭 Yobilo", villamora: "🏪 Villamora" };
const TURNO: Record<string, string> = { "1": "1er turno", "2": "2do turno", "3": "3er turno" };

function diaDesde(d?: string): { desde: Date; hasta: Date; iso: string } {
  const base = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T00:00:00") : new Date();
  base.setHours(0, 0, 0, 0);
  const hasta = new Date(base); hasta.setDate(base.getDate() + 1);
  const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
  return { desde: base, hasta, iso };
}
const isoMas = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/**
 * Pago por producción: elige un día y ve lo producido por turno y lugar, cada
 * helado × su precio de pago (editable) = total del turno. La repartición entre
 * los del turno la hacen ellos; aquí ven cuánto generó el turno.
 */
export default async function PagosProduccionPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const { desde, hasta, iso } = diaDesde(d);
  const label = desde.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });

  const [movs, productos] = await Promise.all([
    prisma.movimientoBodega.findMany({ where: { zona: "produccion", clase: "producto", fecha: { gte: desde, lt: hasta } }, orderBy: { fecha: "asc" } }),
    prisma.producto.findMany({ where: { activo: true, OR: [{ categoria: "Helados" }, { linea: "helado" }] }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, precioTrato: true } }),
  ]);
  const precioDe = new Map(productos.map((p) => [p.id, Number(p.precioTrato ?? 0)]));

  // Agrupa por turno + lugar.
  type Grupo = { key: string; turno: string | null; maquina: string | null; quienes: Set<string>; filas: { nombre: string; cantidad: number; precio: number }[]; total: number };
  const grupos = new Map<string, Grupo>();
  for (const m of movs) {
    const key = `${m.turno ?? "-"}·${m.maquina ?? "-"}`;
    if (!grupos.has(key)) grupos.set(key, { key, turno: m.turno, maquina: m.maquina, quienes: new Set(), filas: [], total: 0 });
    const g = grupos.get(key)!;
    if (m.detalle) m.detalle.split(/[,·]/).map((s) => s.trim()).filter(Boolean).forEach((q) => g.quienes.add(q));
    const precio = m.refId ? (precioDe.get(m.refId) ?? 0) : 0;
    const sub = m.cantidad * precio;
    g.filas.push({ nombre: m.nombre, cantidad: m.cantidad, precio });
    g.total += sub;
  }
  const listaGrupos = [...grupos.values()];
  const totalDia = listaGrupos.reduce((s, g) => s + g.total, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/produccion" className="text-sm font-semibold text-[#1479c4]">← Producción</Link>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">💵 Pago por producción</h1>
        <p className="text-sm text-slate-500">Lo producido en el día × el precio de pago = lo que generó cada turno.</p>
      </div>

      {/* Calendario simple: día anterior / siguiente + selector */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <Link href={`/produccion/pagos?d=${isoMas(iso, -1)}`} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">←</Link>
        <form className="flex items-center gap-2">
          <input type="date" name="d" defaultValue={iso} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button className="rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white">Ver</button>
        </form>
        <Link href={`/produccion/pagos?d=${isoMas(iso, 1)}`} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">→</Link>
      </div>
      <p className="text-center text-sm font-extrabold capitalize text-slate-700">{label} · total {CLP(totalDia)}</p>

      {/* Grupos por turno/lugar */}
      {listaGrupos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay helados registrados este día.</p>
      ) : (
        <div className="space-y-3">
          {listaGrupos.map((g) => (
            <section key={g.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">{TURNO[g.turno ?? ""] ?? "Turno —"} · {LUGAR[g.maquina ?? ""] ?? "—"}</h2>
                <span className="text-base font-extrabold text-emerald-700">{CLP(g.total)}</span>
              </div>
              {g.quienes.size > 0 && <p className="mb-1 text-[11px] text-slate-500">👤 {[...g.quienes].join(", ")}</p>}
              <ul className="divide-y divide-slate-100 text-sm">
                {g.filas.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-1">
                    <span className="min-w-0 truncate text-slate-700">{f.nombre} <span className="text-slate-400">· {f.cantidad} × {CLP(f.precio)}</span></span>
                    <span className="shrink-0 font-bold text-slate-900">{f.precio > 0 ? CLP(f.cantidad * f.precio) : "sin precio"}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Precios de pago editables */}
      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-extrabold text-slate-800">🏷️ Precios de pago por helado (editables)</summary>
        <p className="mb-2 mt-1 text-[11px] text-slate-400">$ que se paga por cada unidad producida. Cambia y guarda.</p>
        <ul className="space-y-2">
          {productos.map((p) => (
            <li key={p.id}>
              <form action={setPrecioTrato} className="flex items-center justify-between gap-2">
                <input type="hidden" name="productoId" value={p.id} />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{p.nombre}</span>
                <input name="precio" defaultValue={p.precioTrato ? String(Number(p.precioTrato)) : ""} inputMode="numeric" placeholder="$0"
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm font-bold" />
                <button className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
              </form>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
