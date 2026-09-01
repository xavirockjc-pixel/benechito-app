import { prisma } from "@/lib/prisma";
import { parseCampos, categoriaFormIcon, frecuenciaLabel } from "@/lib/dominio/checklists";
import { responderFormulario } from "@/app/admin/formularios/actions";

/**
 * Sección de checklists para una app por rol. Muestra las plantillas activas del
 * rol (y las "todos") y permite completarlas. Guarda quién y cuándo.
 */
export default async function ChecklistSeccion({ rol, volver }: { rol: string; volver: string }) {
  const formularios = await prisma.formulario.findMany({
    where: { activo: true, rol: { in: [rol, "todos"] } },
    orderBy: { orden: "asc" },
  });

  if (formularios.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No hay checklists asignados todavía. La central los crea desde el panel.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {formularios.map((f) => {
        const campos = parseCampos(f.campos);
        return (
          <form key={f.id} action={responderFormulario} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="formularioId" value={f.id} />
            <input type="hidden" name="volver" value={volver} />
            <p className="font-display text-base font-extrabold text-slate-900">{categoriaFormIcon[f.categoria] ?? "✅"} {f.nombre}</p>
            <p className="text-xs text-slate-500">{frecuenciaLabel[f.frecuencia] ?? f.frecuencia}</p>

            <div className="mt-3 space-y-3">
              {campos.map((c) => {
                if (c.tipo === "si_no") {
                  return (
                    <label key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <input type="checkbox" name={`c_${c.id}`} value="si" className="h-5 w-5 accent-green-600" />
                      <span className="text-sm font-semibold text-slate-800">{c.label}</span>
                    </label>
                  );
                }
                if (c.tipo === "numero") {
                  return (
                    <label key={c.id} className="block text-sm font-semibold text-slate-700">{c.label}
                      <input type="number" step="any" inputMode="decimal" name={`c_${c.id}`} required={c.requerido} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800" />
                    </label>
                  );
                }
                if (c.tipo === "opcion") {
                  return (
                    <label key={c.id} className="block text-sm font-semibold text-slate-700">{c.label}
                      <select name={`c_${c.id}`} required={c.requerido} defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800">
                        <option value="" disabled>Elegir…</option>
                        {(c.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                  );
                }
                return (
                  <label key={c.id} className="block text-sm font-semibold text-slate-700">{c.label}
                    <input type="text" name={`c_${c.id}`} required={c.requerido} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800" />
                  </label>
                );
              })}

              <label className="block text-sm font-semibold text-slate-700">Notas (opcional)
                <textarea name="notas" rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800" />
              </label>
            </div>

            <button className="mt-3 w-full rounded-xl bg-green-600 py-2.5 text-sm font-extrabold text-white active:brightness-95">✓ Guardar checklist</button>
          </form>
        );
      })}
    </div>
  );
}
