import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { categoriaFormLabel, categoriaFormIcon, rolFormLabel, frecuenciaLabel, parseCampos } from "@/lib/dominio/checklists";
import { toggleFormulario, borrarFormulario, sembrarFormularios } from "./actions";

export const dynamic = "force-dynamic";

export default async function FormulariosPage() {
  const formularios = await prisma.formulario.findMany({ orderBy: [{ rol: "asc" }, { orden: "asc" }] });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">✅ Checklists / BPM</h1>
          <p className="text-sm text-slate-500">Plantillas editables. Se aplican a cada app según el rol.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/formularios/respuestas" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">📋 Ver respuestas</Link>
          <Link href="/admin/formularios/nueva" className="rounded-xl bg-[#1479c4] px-4 py-2 text-sm font-extrabold text-white">＋ Nueva plantilla</Link>
        </div>
      </div>

      {formularios.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">Aún no hay checklists. Puedes partir con un set sugerido (higiene, temperaturas, limpieza, recepción, revisión) y editarlo después.</p>
          <form action={sembrarFormularios} className="mt-4">
            <button className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white">✨ Crear checklists sugeridos</button>
          </form>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {formularios.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-base font-extrabold text-slate-900">{categoriaFormIcon[f.categoria] ?? "✅"} {f.nombre}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {rolFormLabel[f.rol] ?? f.rol} · {categoriaFormLabel[f.categoria] ?? f.categoria} · {frecuenciaLabel[f.frecuencia] ?? f.frecuencia} · {parseCampos(f.campos).length} campos
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${f.activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                  {f.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/admin/formularios/${f.id}/editar`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">✏️ Editar</Link>
                <form action={toggleFormulario}><input type="hidden" name="id" value={f.id} /><button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{f.activo ? "Desactivar" : "Activar"}</button></form>
                <form action={borrarFormulario} className="ml-auto"><input type="hidden" name="id" value={f.id} /><button className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-500">Eliminar</button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
