import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import MicDictado from "@/components/MicDictado";
import { registrarCompraHigiene, crearImplemento, toggleImplemento, borrarImplemento, registrarEntrega } from "./actions";

export const dynamic = "force-dynamic";
const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";
const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function HigienePage() {
  const [gastos, implementos, entregas, materiales] = await Promise.all([
    prisma.gasto.findMany({ where: { categoria: "higiene" }, orderBy: { fecha: "desc" }, take: 15 }),
    prisma.implemento.findMany({ orderBy: { orden: "asc" } }),
    prisma.entregaImplemento.findMany({ orderBy: { fecha: "desc" }, take: 15, include: { implemento: { select: { nombre: true } } } }),
    prisma.materiaPrima.findMany({ where: { activo: true }, select: { id: true, nombre: true, unidad: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">🧴 Higiene, compras y EPP</h1>
          <p className="text-sm text-slate-500">Compras de higiene (van a gastos) y entrega de implementos al equipo.</p>
        </div>
        <MicDictado />
      </div>

      {/* Compras de higiene */}
      <section className="mt-6">
        <h2 className="mb-2 font-display text-lg font-extrabold text-slate-900">Compras de higiene</h2>
        <form action={registrarCompraHigiene} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">Qué compraste
            <input name="concepto" required placeholder="Ej: Cloro, jabón, toalla de papel" className={inputCls} />
          </label>
          <label className="block text-sm font-bold text-slate-700">Monto
            <input name="monto" inputMode="numeric" required placeholder="$" className={inputCls} />
          </label>
          <label className="block text-sm font-bold text-slate-700">Material a reponer (opcional)
            <select name="materiaPrimaId" defaultValue="" className={inputCls}>
              <option value="">— No afecta stock —</option>
              {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.unidad})</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">Cantidad que ingresa (si repones)
            <input name="cantidad" inputMode="decimal" placeholder="0" className={inputCls} />
          </label>
          <label className="block text-sm font-bold text-slate-700 sm:col-span-2">Notas
            <input name="notas" className={inputCls} />
          </label>
          <button className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white sm:col-span-2">Registrar compra</button>
        </form>
        {gastos.length > 0 && (
          <div className="mt-3 space-y-1">
            {gastos.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm">
                <span className="truncate font-semibold text-slate-700">{g.concepto}</span>
                <span className="shrink-0 font-bold text-slate-800">{fmtCLP(Number(g.monto))} · {fmt(g.fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Implementos / EPP */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-lg font-extrabold text-slate-900">Implementos (EPP)</h2>
          <form action={crearImplemento} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <input name="nombre" required placeholder="Agregar: pechera, cofia, guantes…" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" />
            <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white">＋</button>
          </form>
          <div className="mt-2 space-y-1">
            {implementos.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Agrega los implementos que entregas al equipo.</p>}
            {implementos.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <span className={`flex-1 font-semibold ${i.activo ? "text-slate-800" : "text-slate-400 line-through"}`}>{i.nombre}</span>
                <form action={toggleImplemento}><input type="hidden" name="id" value={i.id} /><button className="text-xs font-bold text-slate-500">{i.activo ? "ocultar" : "activar"}</button></form>
                <form action={borrarImplemento}><input type="hidden" name="id" value={i.id} /><button className="text-xs font-bold text-red-500">✕</button></form>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 font-display text-lg font-extrabold text-slate-900">Registrar entrega</h2>
          <form action={registrarEntrega} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-bold text-slate-700">Implemento
              <select name="implementoId" required defaultValue="" className={inputCls}>
                <option value="" disabled>Elegir…</option>
                {implementos.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-bold text-slate-700">Trabajador
                <input name="trabajador" required placeholder="Nombre" className={inputCls} />
              </label>
              <label className="block text-sm font-bold text-slate-700">Cantidad
                <input name="cantidad" inputMode="numeric" defaultValue="1" className={inputCls} />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-700">Notas
              <input name="notas" className={inputCls} />
            </label>
            <button className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-extrabold text-white">Registrar entrega</button>
          </form>
          {entregas.length > 0 && (
            <div className="mt-3 space-y-1">
              {entregas.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm">
                  <span className="truncate font-semibold text-slate-700">{e.implemento.nombre} × {e.cantidad} → {e.trabajador}</span>
                  <span className="shrink-0 text-xs text-slate-500">{fmt(e.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
