import Link from "next/link";
import { getCanales } from "@/lib/dominio/canales";
import { crearCanal, editarCanal, toggleCanal } from "./actions";

export const dynamic = "force-dynamic";

export default async function CanalesPage() {
  const canales = await getCanales();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/ventas" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Ventas</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Canales de venta</h1>
      <p className="text-sm text-slate-500">Los canales con los que separas tus ventas. Puedes agregar los tuyos.</p>

      {/* Agregar canal */}
      <form action={crearCanal} className="mt-4 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-600">Nombre del canal
          <input name="nombre" required placeholder="Ej: Feria, Mayorista, App…" className="mt-1 block w-56 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">Color
          <input type="color" name="color" defaultValue="#0f766e" className="mt-1 block h-11 w-16 rounded-lg border border-slate-300" />
        </label>
        <button className="rounded-lg bg-[#1479c4] px-5 py-2.5 text-sm font-extrabold text-white active:scale-95">➕ Agregar canal</button>
      </form>

      {/* Lista */}
      <div className="mt-5 space-y-2">
        {canales.map((c) => (
          <div key={c.codigo} className={`rounded-xl border bg-white p-3 shadow-sm ${c.activo ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
            <form action={editarCanal} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <span className="h-6 w-6 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <input name="nombre" defaultValue={c.nombre} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold" />
              <input type="color" name="color" defaultValue={c.color} className="h-9 w-12 rounded border border-slate-300" />
              <code className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{c.codigo}</code>
              <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
            </form>
            <form action={toggleCanal} className="mt-1 text-right">
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs font-semibold text-slate-400">{c.activo ? "Desactivar" : "Activar"}</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
