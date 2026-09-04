import { prisma } from "@/lib/prisma";
import { setCosto } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function colorMargen(p: number) {
  if (p < 0.15) return "#e23b2c";
  if (p < 0.35) return "#f28a1e";
  return "#2f9e44";
}

export default async function RentabilidadPage() {
  const hace30 = new Date(Date.now() - 30 * 864e5);
  const [productos, ventasAgg] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, linea: true, costo: true, precios: { select: { precio: true, cantidadMinima: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { tipo: "venta", fecha: { gte: hace30 } } }),
  ]);
  const ventasMap = new Map(ventasAgg.map((v) => [v.productoId, num(v._sum.cantidad)]));

  const rows = productos.map((p) => {
    const costo = num(p.costo);
    const cm1 = p.precios.filter((x) => x.cantidadMinima === 1).map((x) => num(x.precio));
    const todos = p.precios.map((x) => num(x.precio));
    const precioRef = cm1.length ? Math.max(...cm1) : todos.length ? Math.max(...todos) : 0;
    const margen = precioRef - costo;
    const margenPct = precioRef > 0 ? margen / precioRef : 0;
    const unidades = ventasMap.get(p.id) ?? 0;
    const utilidad = margen * unidades;
    return { p, costo, precioRef, margen, margenPct, unidades, utilidad, tieneCosto: costo > 0, tienePrecio: precioRef > 0 };
  });

  const conDatos = rows.filter((r) => r.tieneCosto && r.tienePrecio).sort((a, b) => a.margenPct - b.margenPct);
  const sinCosto = rows.filter((r) => !r.tieneCosto && r.tienePrecio);
  const margenProm = conDatos.length ? conDatos.reduce((s, r) => s + r.margenPct, 0) / conDatos.length : 0;
  const utilidadTotal = conDatos.reduce((s, r) => s + r.utilidad, 0);
  const peor = conDatos[0];
  const mejor = conDatos[conDatos.length - 1];

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📊 Rentabilidad por producto</h1>
        <p className="text-sm text-slate-500">Margen real (precio − costo) y utilidad estimada de los últimos 30 días. Ordenado del <b>menos rentable</b> arriba.</p>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Margen promedio" valor={pct(margenProm)} color={colorMargen(margenProm)} />
        <Kpi label="Utilidad 30 días" valor={CLP(utilidadTotal)} color="#2f9e44" />
        <Kpi label="Más rentable" valor={mejor ? mejor.p.nombre : "—"} sub={mejor ? pct(mejor.margenPct) : ""} color="#1479c4" />
        <Kpi label="Menos rentable" valor={peor ? peor.p.nombre : "—"} sub={peor ? pct(peor.margenPct) : ""} color="#e23b2c" />
      </div>

      {sinCosto.length > 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          💡 Hay <b>{sinCosto.length}</b> producto(s) sin costo cargado (más abajo). Sin costo no se puede calcular el margen — cárgalo y aparecen en el ranking.
        </p>
      )}

      {/* Tabla con datos */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-2">Producto</th>
              <th className="px-2 text-right">Costo</th>
              <th className="px-2 text-right">Precio</th>
              <th className="px-2 text-right">Margen</th>
              <th className="px-2 text-right">%</th>
              <th className="px-2 text-right">Vend. 30d</th>
              <th className="px-2 text-right">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {conDatos.map((r) => (
              <tr key={r.p.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 font-semibold text-slate-800">{r.p.nombre}</td>
                <td className="px-2 text-right tabular-nums text-slate-600">{CLP(r.costo)}</td>
                <td className="px-2 text-right tabular-nums text-slate-600">{CLP(r.precioRef)}</td>
                <td className="px-2 text-right tabular-nums font-semibold" style={{ color: colorMargen(r.margenPct) }}>{CLP(r.margen)}</td>
                <td className="px-2 text-right tabular-nums font-extrabold" style={{ color: colorMargen(r.margenPct) }}>{pct(r.margenPct)}</td>
                <td className="px-2 text-right tabular-nums text-slate-500">{r.unidades}</td>
                <td className="px-2 text-right tabular-nums font-semibold text-slate-700">{CLP(r.utilidad)}</td>
              </tr>
            ))}
            {conDatos.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-400">Carga costos abajo para ver el ranking.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Cargar costos faltantes */}
      {sinCosto.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Cargar costo faltante</h2>
          <ul className="space-y-2">
            {sinCosto.map((r) => (
              <li key={r.p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{r.p.nombre} <span className="text-xs text-slate-400">· precio {CLP(r.precioRef)}</span></span>
                <form action={setCosto} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.p.id} />
                  <input name="costo" inputMode="numeric" placeholder="costo $" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-base font-extrabold text-slate-900" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="text-[11px] font-bold" style={{ color }}>{sub}</p>}
    </div>
  );
}
