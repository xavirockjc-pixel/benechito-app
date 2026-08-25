import { prisma } from "@/lib/prisma";
import { lineaLabel } from "@/lib/dominio/produccion";
import { crearSabor, eliminarSabor, moverTipoSeccion } from "./actions";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { k: "dulce", label: "🍫 Dulces artesanales" },
  { k: "helado", label: "🍦 Helados" },
];
const seccionLabel: Record<string, string> = { dulce: "🍫 Dulces artesanales", helado: "🍦 Helados", otros: "Sin clasificar" };
const nombreTipo = (l: string) => lineaLabel[l] ?? l.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function SaboresPage() {
  const sabores = await prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ seccion: "asc" }, { linea: "asc" }, { nombre: "asc" }] });

  // Agrupa por sección → tipo(linea).
  const porSeccion = new Map<string, Map<string, typeof sabores>>();
  for (const s of sabores) {
    const sec = s.seccion ?? "otros";
    if (!porSeccion.has(sec)) porSeccion.set(sec, new Map());
    const tipos = porSeccion.get(sec)!;
    if (!tipos.has(s.linea)) tipos.set(s.linea, []);
    tipos.get(s.linea)!.push(s);
  }
  const tiposExistentes = [...new Set(sabores.map((s) => s.linea))].sort();

  const ordenSec = ["dulce", "helado", "otros"];
  const seccionesConDatos = [...porSeccion.keys()].sort((a, b) => ordenSec.indexOf(a) - ordenSec.indexOf(b));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🍫🍦 Sabores</h1>
      <p className="text-sm text-slate-500">Por sección y tipo. Agrega o elimina sabores; puedes crear un tipo nuevo escribiéndolo.</p>

      {/* Agregar sabor (sección + tipo + sabor) */}
      <form action={crearSabor} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-700">➕ Agregar sabor</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Sección
            <select name="seccion" defaultValue="helado" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {SECCIONES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Tipo existente
            <select name="linea" defaultValue="" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">— elegir —</option>
              {tiposExistentes.map((l) => <option key={l} value={l}>{nombreTipo(l)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">…o tipo nuevo
            <input name="tipoNuevo" placeholder="Ej: Paletas de agua, Postres 500ml…" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Sabor
            <input name="nombre" required placeholder="Ej: Frutilla" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-3 rounded-lg bg-[#1479c4] px-5 py-2 text-sm font-extrabold text-white active:brightness-110">Agregar sabor</button>
        <p className="mt-1 text-[11px] text-slate-400">Elige un tipo existente <b>o</b> escribe uno nuevo (se crea la sección/tipo al vuelo).</p>
      </form>

      {/* Jerarquía: sección → tipo (desplegable) → sabores */}
      {seccionesConDatos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aún no hay sabores. Agrega el primero arriba.</p>
      ) : (
        seccionesConDatos.map((sec) => {
          const tipos = porSeccion.get(sec)!;
          const totalSec = [...tipos.values()].reduce((a, arr) => a + arr.length, 0);
          return (
            <div key={sec} className="mt-6">
              <h2 className="mb-2 text-lg font-bold text-slate-900">{seccionLabel[sec] ?? sec} <span className="text-sm font-normal text-slate-400">({totalSec})</span></h2>
              <div className="space-y-2">
                {[...tipos.entries()].map(([linea, lista]) => (
                  <details key={linea} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                      <span className="font-bold text-slate-800">{nombreTipo(linea)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{lista.length} sabor(es)</span>
                    </summary>
                    <div className="border-t border-slate-100 p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {lista.map((s) => (
                          <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700">
                            {s.nombre}
                            <form action={eliminarSabor} className="inline">
                              <input type="hidden" name="id" value={s.id} />
                              <button className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-xs text-slate-500 hover:bg-red-500 hover:text-white" title="Eliminar">✕</button>
                            </form>
                          </span>
                        ))}
                      </div>
                      {sec === "otros" && (
                        <form action={moverTipoSeccion} className="mt-3 flex items-center gap-2">
                          <input type="hidden" name="linea" value={linea} />
                          <span className="text-xs font-semibold text-slate-500">Clasificar como:</span>
                          <select name="seccion" defaultValue="helado" className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                            {SECCIONES.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
                          </select>
                          <button className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white">Guardar</button>
                        </form>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
