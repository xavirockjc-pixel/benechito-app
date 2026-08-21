import { prisma } from "@/lib/prisma";
import { crearSabor, actualizarSabor, eliminarSabor } from "./actions";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas",
  cuchufli: "Cuchuflís",
  helado: "Helados",
  proteico: "Proteicos",
};
const LINEAS = ["trufa", "cuchufli", "helado"];
const inputCls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500";

export default async function SaboresPage() {
  const sabores = await prisma.sabor.findMany({ orderBy: [{ linea: "asc" }, { nombre: "asc" }] });
  const porLinea = sabores.reduce<Record<string, typeof sabores>>((acc, s) => {
    (acc[s.linea] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Sabores</h1>
      <p className="text-sm text-slate-500">
        Los sabores no tienen precio. Se usan para producción y para la <strong>reposición por sabor</strong> de los Puntos.
      </p>

      {/* Agregar sabor */}
      <form action={crearSabor} className="mt-5 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-bold text-slate-700">Nuevo sabor
          <input name="nombre" required placeholder="Ej: Frutilla" className={`mt-1 block w-52 ${inputCls}`} />
        </label>
        <label className="text-sm font-bold text-slate-700">Línea
          <select name="linea" required defaultValue="trufa" className={`mt-1 block ${inputCls}`}>
            {LINEAS.map((l) => <option key={l} value={l}>{lineaLabel[l]}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700">Agregar</button>
      </form>

      {/* Lista por línea */}
      {LINEAS.map((linea) => {
        const items = porLinea[linea] ?? [];
        return (
          <div key={linea} className="mt-6">
            <h2 className="mb-2 text-lg font-bold text-slate-900">
              {lineaLabel[linea]} <span className="text-sm font-normal text-slate-400">({items.length})</span>
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">Sin sabores. Agrega arriba.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <div key={s.id} className={`rounded-xl border p-3 shadow-sm ${s.activo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
                    <form action={actualizarSabor} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="nombre" defaultValue={s.nombre} className={`flex-1 ${inputCls}`} />
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <input type="checkbox" name="activo" value="si" defaultChecked={s.activo} className="h-4 w-4 accent-[#1479c4]" />
                      </label>
                      <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
                    </form>
                    <form action={eliminarSabor} className="mt-1 text-right">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-rojo/60 hover:text-rojo">Eliminar</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
