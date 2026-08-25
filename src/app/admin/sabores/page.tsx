import { prisma } from "@/lib/prisma";
import AgregarSaborVoz from "./AgregarSaborVoz";
import { crearTipo, eliminarTipo, moverTipoSeccion, eliminarSabor, crearFormato, eliminarFormato, precargarBase } from "./actions";

export const dynamic = "force-dynamic";

const seccionLabel: Record<string, string> = { dulce: "🍫 Dulces artesanales", helado: "🍦 Helados" };
const nombreSec = (s: string) => seccionLabel[s] ?? `📦 ${s.charAt(0).toUpperCase() + s.slice(1)}`;

export default async function SaboresPage() {
  const [tipos, sabores, formatos] = await Promise.all([
    prisma.tipo.findMany({ where: { activo: true }, orderBy: [{ seccion: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.formato.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const saboresDe = (codigo: string) => sabores.filter((s) => s.linea === codigo);
  const formatosDe = (codigo: string) => formatos.filter((f) => f.linea === codigo);
  const secciones = [...new Set(tipos.map((t) => t.seccion))].sort((a, b) => (a === "dulce" ? -1 : b === "dulce" ? 1 : a.localeCompare(b)));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">🍫🍦 Sabores, tipos y formatos</h1>
          <p className="text-sm text-slate-500">Todo administrable: sección, tipo, sabor y formato. Agrega sabores por voz.</p>
        </div>
        {tipos.length === 0 && (
          <form action={precargarBase}>
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">⚡ Precargar tipos base</button>
          </form>
        )}
      </div>

      {/* Crear tipo (con sección existente o nueva) */}
      <form action={crearTipo} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-bold text-slate-700">➕ Nuevo tipo</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold text-slate-600">Sección
            <select name="seccion" defaultValue="helado" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="dulce">🍫 Dulces artesanales</option>
              <option value="helado">🍦 Helados</option>
              {secciones.filter((s) => s !== "dulce" && s !== "helado").map((s) => <option key={s} value={s}>{nombreSec(s)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">…o sección nueva
            <input name="seccionNueva" placeholder="Ej: Bebidas" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Nombre del tipo
            <input name="nombre" required placeholder="Ej: Paletas de agua" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-3 rounded-lg bg-[#1479c4] px-5 py-2 text-sm font-extrabold text-white">Crear tipo</button>
      </form>

      {/* Jerarquía: sección → tipo (desplegable) → sabores + formatos */}
      {tipos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay tipos. Crea uno arriba o usa “⚡ Precargar tipos base”.
        </p>
      ) : (
        secciones.map((sec) => {
          const tiposSec = tipos.filter((t) => t.seccion === sec);
          return (
            <div key={sec} className="mt-6">
              <h2 className="mb-2 text-lg font-bold text-slate-900">{nombreSec(sec)} <span className="text-sm font-normal text-slate-400">({tiposSec.length} tipos)</span></h2>
              <div className="space-y-2">
                {tiposSec.map((t) => {
                  const ss = saboresDe(t.codigo);
                  const ff = formatosDe(t.codigo);
                  return (
                    <details key={t.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                        <span className="font-bold text-slate-800">{t.nombre}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{ss.length} sab · {ff.length} form</span>
                      </summary>
                      <div className="space-y-3 border-t border-slate-100 p-3">
                        {/* Sabores */}
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Sabores</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ss.length === 0 && <span className="text-xs text-slate-400">Sin sabores aún.</span>}
                            {ss.map((s) => (
                              <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-700">
                                {s.nombre}
                                <form action={eliminarSabor} className="inline"><input type="hidden" name="id" value={s.id} /><button className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-xs text-slate-500 hover:bg-red-500 hover:text-white">✕</button></form>
                              </span>
                            ))}
                          </div>
                          <AgregarSaborVoz linea={t.codigo} />
                        </div>

                        {/* Formatos */}
                        <div>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Formatos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ff.length === 0 && <span className="text-xs text-slate-400">Sin formatos.</span>}
                            {ff.map((f) => (
                              <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-sm text-[#1479c4]">
                                {f.nombre}
                                <form action={eliminarFormato} className="inline"><input type="hidden" name="id" value={f.id} /><button className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-xs text-[#1479c4] hover:bg-red-500 hover:text-white">✕</button></form>
                              </span>
                            ))}
                          </div>
                          <form action={crearFormato} className="mt-2 flex items-center gap-2">
                            <input type="hidden" name="linea" value={t.codigo} />
                            <input name="nombre" placeholder="Formato — ej: Bandeja 50" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                            <button className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">Agregar</button>
                          </form>
                        </div>

                        {/* Administración del tipo */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                          <form action={moverTipoSeccion} className="flex items-center gap-1">
                            <input type="hidden" name="codigo" value={t.codigo} />
                            <span className="text-xs text-slate-500">Sección:</span>
                            <select name="seccion" defaultValue={t.seccion} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
                              <option value="dulce">Dulces</option>
                              <option value="helado">Helados</option>
                            </select>
                            <button className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Mover</button>
                          </form>
                          <form action={eliminarTipo} className="ml-auto">
                            <input type="hidden" name="codigo" value={t.codigo} />
                            <button className="text-xs font-semibold text-red-500">Eliminar tipo</button>
                          </form>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
