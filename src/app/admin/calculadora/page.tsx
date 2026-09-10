import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CalculadoraForm, { type CalcInicial } from "./CalculadoraForm";
import { eliminarCalculo } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);

type Item = { nombre: string; cantidad: number; costoUnit: number };
function parseItems(s: string | null): Item[] {
  try { const a = JSON.parse(s ?? "[]"); return Array.isArray(a) ? a : []; } catch { return []; }
}
function costoUnidadDe(c: { items: string | null; costoExtra: unknown; rendimiento: number | null; costoCompra: unknown }) {
  if (c.costoCompra != null) return num(c.costoCompra); // reventa
  const receta = parseItems(c.items).reduce((s, it) => s + num(it.cantidad) * num(it.costoUnit), 0) + num(c.costoExtra);
  const rend = Math.max(1, c.rendimiento ?? 1);
  return receta / rend;
}

export default async function CalculadoraPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;

  const [productos, insumosRaw, calculos, editCalc] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.materiaPrima.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { nombre: true, costo: true, unidad: true } }),
    prisma.calculo.findMany({ orderBy: { createdAt: "desc" } }),
    edit ? prisma.calculo.findUnique({ where: { id: edit } }) : Promise.resolve(null),
  ]);

  const insumos = insumosRaw.map((m) => ({ nombre: m.nombre, costo: num(m.costo), unidad: m.unidad }));

  const inicial: CalcInicial | undefined = editCalc
    ? {
        id: editCalc.id, tipo: editCalc.tipo, nombre: editCalc.nombre, productoId: editCalc.productoId,
        precioVenta: editCalc.precioVenta != null ? num(editCalc.precioVenta) : null,
        rendimiento: editCalc.rendimiento, costoExtra: editCalc.costoExtra != null ? num(editCalc.costoExtra) : null,
        costoCompra: editCalc.costoCompra != null ? num(editCalc.costoCompra) : null,
        metaUnidades: editCalc.metaUnidades,
        items: parseItems(editCalc.items),
        inversion: editCalc.inversion != null ? num(editCalc.inversion) : null,
        retornoMensual: editCalc.retornoMensual != null ? num(editCalc.retornoMensual) : null,
        notas: editCalc.notas,
      }
    : undefined;

  // Ventas del mes por producto (unidades) para el informe.
  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const idsEnlazados = calculos.map((c) => c.productoId).filter(Boolean) as string[];
  const ventasMes = idsEnlazados.length
    ? await prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { tipo: "venta", fecha: { gte: inicioMes }, productoId: { in: idsEnlazados } } })
    : [];
  const unidadesDe = new Map(ventasMes.map((v) => [v.productoId, num(v._sum.cantidad)]));

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🧮 Calculadora</h1>
        <p className="text-sm text-slate-500">Rentabilidad de un producto (con su receta) o retorno de un proyecto/inversión. Todo editable.</p>
      </div>

      <div className="mt-4">
        <CalculadoraForm productos={productos} insumos={insumos} inicial={inicial} />
        {edit && <Link href="/admin/calculadora" className="mt-2 inline-block text-xs font-semibold text-slate-500 underline">Cancelar edición / nuevo cálculo</Link>}
      </div>

      {/* Guardados */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Guardados ({calculos.length})</h2>
      {calculos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">Aún no guardas cálculos.</p>
      ) : (
        <ul className="space-y-3">
          {calculos.map((c) => {
            if (c.tipo === "proyecto") {
              const inv = num(c.inversion), ret = num(c.retornoMensual);
              const meses = ret > 0 ? inv / ret : 0;
              return (
                <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Cabecera nombre={`🏗️ ${c.nombre}`} id={c.id} />
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <Mini label="Inversión" valor={CLP(inv)} />
                    <Mini label="Por mes" valor={CLP(ret)} />
                    <Mini label="Se recupera en" valor={ret > 0 ? `${meses.toFixed(1)} m` : "—"} color="#15803d" />
                  </div>
                  {c.notas && <p className="mt-2 text-xs text-slate-500">{c.notas}</p>}
                </li>
              );
            }
            // producto
            const cu = costoUnidadDe(c);
            const pv = num(c.precioVenta);
            const util = pv - cu;
            const margen = pv > 0 ? (util / pv) * 100 : 0;
            const unidades = c.productoId ? (unidadesDe.get(c.productoId) ?? 0) : 0;
            const ingreso = unidades * pv, costoTot = unidades * cu, utilTot = ingreso - costoTot;
            return (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Cabecera nombre={`🍫 ${c.nombre}`} id={c.id} />
                <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                  <Mini label="Costo/unidad" valor={CLP(cu)} />
                  <Mini label="Precio venta" valor={CLP(pv)} />
                  <Mini label="Utilidad/unidad" valor={CLP(util)} color={util >= 0 ? "#15803d" : "#b91c1c"} />
                  <Mini label="Margen" valor={`${Math.round(margen)}%`} color={margen >= 0 ? "#15803d" : "#b91c1c"} />
                </div>
                {c.productoId && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">📈 Informe de ventas (este mes)</p>
                    {unidades > 0 ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                          <Mini label="Vendidas" valor={`${unidades} u.${c.metaUnidades ? ` / meta ${c.metaUnidades}` : ""}`} />
                          <Mini label="Ingreso" valor={CLP(ingreso)} />
                          <Mini label="Costo" valor={CLP(costoTot)} />
                          <Mini label="Utilidad" valor={CLP(utilTot)} color={utilTot >= 0 ? "#15803d" : "#b91c1c"} />
                        </div>
                        <Veredicto utilUnidad={util} unidades={unidades} meta={c.metaUnidades ?? 0} />
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">Sin ventas de este producto en el mes.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Cabecera({ nombre, id }: { nombre: string; id: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="font-bold text-slate-900">{nombre}</p>
      <div className="flex items-center gap-2">
        <Link href={`/admin/calculadora?edit=${id}`} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:border-slate-500">Editar</Link>
        <form action={eliminarCalculo}><input type="hidden" name="id" value={id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
      </div>
    </div>
  );
}

function Veredicto({ utilUnidad, unidades, meta }: { utilUnidad: number; unidades: number; meta: number }) {
  let tono = "bg-slate-100 text-slate-700", texto = "";
  if (utilUnidad <= 0) {
    tono = "bg-red-100 text-red-700";
    texto = `🔴 Estás perdiendo ${CLP(-utilUnidad)} por unidad. Sube el precio o baja el costo antes de seguir vendiendo.`;
  } else if (meta > 0 && unidades >= meta) {
    tono = "bg-green-100 text-green-700";
    texto = `✅ Superó la meta (${unidades}/${meta}) y hay buena utilidad → puedes dar un bono al vendedor.`;
  } else if (meta > 0) {
    tono = "bg-amber-100 text-amber-700";
    texto = `⚠️ Va bajo la meta (${unidades}/${meta}). Aplica un aumento de precio o impulsa la venta para que rinda.`;
  } else {
    texto = `Cada unidad deja ${CLP(utilUnidad)}. Define una meta para comparar y decidir aumentos o bonos.`;
  }
  return <p className={`mt-2 rounded-lg px-3 py-2 text-xs font-bold ${tono}`}>{texto}</p>;
}

function Mini({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="text-sm font-extrabold tabular-nums" style={{ color: color ?? "#0f172a" }}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
