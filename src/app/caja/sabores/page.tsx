import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleSaborDisponible, marcarTodosDisponibles, togglePermiteMixto } from "@/app/admin/productos/actions";

export const dynamic = "force-dynamic";

const lista = (s: string | null) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

export default async function SaboresCajaPage() {
  const productos = await prisma.producto.findMany({
    where: { activo: true, publicarTienda: true },
    orderBy: [{ seccion: "asc" }, { nombre: "asc" }],
  });
  const conSabores = productos.filter((p) => lista(p.saboresTienda).length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">🍧 Sabores disponibles hoy</h1>
          <p className="text-sm text-slate-500">Marca los que <b>hay hoy</b>. El cliente en la tienda solo verá esos.</p>
        </div>
        <a href="/tienda" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#0f7a44] px-4 py-2 text-sm font-bold text-white active:scale-95">🛒 Ver tienda</a>
      </div>

      {conSabores.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No hay productos con sabores publicados en la tienda todavía.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {conSabores.map((p) => {
            const sabores = lista(p.saboresTienda);
            const noDisp = new Set(lista(p.saboresNoDisp));
            const hay = sabores.filter((s) => !noDisp.has(s)).length;
            return (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold text-slate-900">{p.nombre} <span className="text-xs font-normal text-slate-400">· {hay}/{sabores.length} disponibles</span></p>
                  <div className="flex items-center gap-2">
                    <form action={togglePermiteMixto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className={`rounded-lg px-2.5 py-1 text-xs font-bold ${p.permiteMixto ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"}`}>🎲 Mixto al azar</button>
                    </form>
                    <form action={marcarTodosDisponibles}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">✓ Todos</button>
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sabores.map((s) => {
                    const disp = !noDisp.has(s);
                    return (
                      <form key={s} action={toggleSaborDisponible}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="sabor" value={s} />
                        <button className={`rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${disp ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-slate-100 text-slate-400 line-through"}`}>
                          {disp ? "✓" : "✕"} {s}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-[11px] text-slate-400">💡 Toca un sabor para marcarlo agotado (queda tachado) o volver a activarlo. Cambia al instante en la tienda online.</p>
      <Link href="/caja" className="mt-3 inline-block text-sm font-semibold text-[#0f7a44]">← Volver a la caja</Link>
    </div>
  );
}
