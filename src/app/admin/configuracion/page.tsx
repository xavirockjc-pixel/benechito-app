import { empresaActual } from "@/lib/dominio/empresa";
import { RUBROS_LISTA } from "@/lib/dominio/rubros";
import { SEED } from "@/lib/dominio/seed-rubro";
import { actualizarEmpresa, precargarDatosRubro } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ seed?: string }> }) {
  const { seed } = await searchParams;
  const empresa = await empresaActual();
  const seedRubro = SEED[empresa.rubro as keyof typeof SEED] ?? SEED.fabrica;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">⚙️ Configuración del negocio</h1>
      <p className="text-sm text-slate-500">
        El <b>rubro</b> adapta todo el sistema con el mismo motor: renombra las áreas, cambia los colores
        y muestra u oculta módulos. Cámbialo y el panel se actualiza al instante.
      </p>

      {seed === "ok" && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 ring-1 ring-green-200">
          ✅ Datos base del rubro precargados (sucursal, ubicaciones, listas de precio y tipos).
        </p>
      )}

      <form action={actualizarEmpresa} className="mt-5 space-y-6">
        {/* Nombre */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nombre del negocio
            <input name="nombre" defaultValue={empresa.nombre} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
        </div>

        {/* Rubro */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Rubro / plantilla</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {RUBROS_LISTA.map((r) => {
              const activo = r.id === empresa.rubro;
              const oculta = r.ocultar.length;
              return (
                <label key={r.id}
                  className={`relative cursor-pointer rounded-2xl border-2 bg-white p-3 shadow-sm transition has-[:checked]:border-[#1479c4] has-[:checked]:ring-2 has-[:checked]:ring-blue-100 ${activo ? "border-[#1479c4]" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="rubro" value={r.id} defaultChecked={activo} className="sr-only" />
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-white shadow"
                      style={{ background: `linear-gradient(135deg, ${r.tema.degradado[0]}, ${r.tema.degradado[1]})` }}>{r.emoji}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{r.nombre}</span>
                      <span className="block text-[11px] text-slate-400">{oculta === 0 ? "Ecosistema completo" : `Oculta ${oculta} módulo${oculta > 1 ? "s" : ""}`}</span>
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <button className="rounded-full bg-[#1479c4] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">
          Guardar configuración
        </button>
      </form>

      {/* Precargar datos base del rubro */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">📦 Datos base del rubro</h2>
        <p className="mt-1 text-sm text-slate-500">
          Precarga lo esencial para arrancar según el rubro actual (<b>{empresa.rubro}</b>): sucursal,
          ubicaciones, listas de precio y tipos/formatos. Puedes correrlo varias veces — no duplica.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{seedRubro.ubicaciones.length}</b> ubicaciones</div>
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{seedRubro.listas.length}</b> listas de precio</div>
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{seedRubro.tipos.length}</b> tipos / líneas</div>
          <div className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{seedRubro.formatos.length}</b> formatos</div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Incluye: {seedRubro.tipos.map((t) => t.nombre).join(" · ")}</p>
        <form action={precargarDatosRubro} className="mt-3">
          <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-125">
            ⚡ Precargar datos de este rubro
          </button>
        </form>
      </div>
    </div>
  );
}
