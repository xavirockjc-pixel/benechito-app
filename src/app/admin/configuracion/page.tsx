import { empresaActual } from "@/lib/dominio/empresa";
import { RUBROS_LISTA } from "@/lib/dominio/rubros";
import { SEED } from "@/lib/dominio/seed-rubro";
import { actualizarEmpresa, precargarDatosRubro, actualizarHorarioAcceso, autorizarAccesoExtra, revocarAccesoExtra, cambiarModoMenu } from "./actions";

const ROLES_HORARIO = [
  { id: "caja", label: "🛒 Local (caja)" },
  { id: "bodega", label: "📦 Bodega" },
  { id: "produccion", label: "🏭 Producción" },
  { id: "vendedor", label: "🚚 Vendedor / reparto" },
];

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ seed?: string; horario?: string; permiso?: string; menu?: string }> }) {
  const { seed, horario, permiso, menu } = await searchParams;
  const empresa = await empresaActual();
  const seedRubro = SEED[empresa.rubro as keyof typeof SEED] ?? SEED.fabrica;
  const rolesActivos = new Set((empresa.accesoRoles ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const permisoVigente = empresa.accesoExtraHasta && new Date() < new Date(empresa.accesoExtraHasta);
  const permisoHasta = empresa.accesoExtraHasta ? new Date(empresa.accesoExtraHasta).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }) : "";

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

      {/* Modo del menú: simple o completo */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">🧭 Modo del menú</h2>
        <p className="mt-1 text-sm text-slate-500">
          <b>Simple</b>: solo el núcleo que usas a diario. <b>Completo</b>: agrega el grupo <b>🧪 Extras / En revisión</b> (duplicados y módulos por implementar/ajustar). Nada se borra.
        </p>
        {menu === "ok" && <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 ring-1 ring-green-200">✅ Menú actualizado.</p>}
        <form action={cambiarModoMenu} className="mt-3 flex flex-wrap gap-2">
          {[["simple", "🟢 Simple (recomendado)"], ["completo", "🧪 Completo (con Extras)"]].map(([v, lbl]) => {
            const activo = v === "simple" ? empresa.modoSimple : !empresa.modoSimple;
            return (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="modo" value={v} defaultChecked={activo} className="peer sr-only" />
                <span className="block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 peer-checked:border-[#1479c4] peer-checked:bg-blue-50 peer-checked:text-[#1479c4]">{lbl}</span>
              </label>
            );
          })}
          <button className="rounded-full bg-[#1479c4] px-5 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110">Aplicar</button>
        </form>
      </div>

      {/* Horario de acceso de trabajadores */}
      <div id="acceso" className="mt-6 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">🔒 Horario de acceso</h2>
        <p className="mt-1 text-sm text-slate-500">
          Los roles marcados solo pueden usar su app dentro de este horario (hora de Chile). Fuera de él se les
          bloquea la app. <b>Tú (propietario/admin) nunca te bloqueas.</b> Deja las horas vacías para no limitar.
        </p>
        {horario === "ok" && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 ring-1 ring-green-200">✅ Horario guardado.</p>
        )}
        <form action={actualizarHorarioAcceso} className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Desde
              <input type="time" name="accesoDesde" defaultValue={empresa.accesoDesde ?? ""} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Hasta
              <input type="time" name="accesoHasta" defaultValue={empresa.accesoHasta ?? ""} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Aplicar a</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES_HORARIO.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm has-[:checked]:border-[#1479c4] has-[:checked]:bg-blue-50">
                  <input type="checkbox" name="accesoRoles" value={r.id} defaultChecked={rolesActivos.has(r.id)} className="h-4 w-4" />
                  <span className="font-semibold text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="rounded-full bg-[#1479c4] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">
            Guardar horario
          </button>
        </form>

        {/* Permiso temporal fuera de horario */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-extrabold text-slate-800">🔓 Permiso fuera de horario</h3>
          <p className="mt-1 text-xs text-slate-500">Autoriza el acceso por un rato aunque esté fuera del horario (ej: quedarse a cerrar).</p>

          {permiso === "ok" && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">✅ Acceso autorizado.</p>}
          {permiso === "revocado" && <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Permiso revocado.</p>}

          {permisoVigente ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm">
              <span className="font-bold text-sky-800">🔓 Acceso autorizado hasta las {permisoHasta}</span>
              <form action={revocarAccesoExtra}>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white active:brightness-110">Revocar ahora</button>
              </form>
            </div>
          ) : (
            <form action={autorizarAccesoExtra} className="mt-3 space-y-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">¿A quién?</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES_HORARIO.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50">
                      <input type="checkbox" name="roles" value={r.id} defaultChecked={rolesActivos.has(r.id)} className="h-4 w-4" />
                      <span className="font-semibold text-slate-700">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">¿Por cuánto tiempo?</p>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 120].map((m, i) => (
                    <label key={m} className="cursor-pointer">
                      <input type="radio" name="minutos" value={m} defaultChecked={i === 1} className="peer sr-only" />
                      <span className="block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-checked:text-white">
                        {m < 60 ? `${m} min` : `${m / 60} h`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110">Autorizar acceso</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
