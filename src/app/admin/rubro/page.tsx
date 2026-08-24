import { empresaActual } from "@/lib/dominio/empresa";
import { RUBROS_LISTA, rubroDe } from "@/lib/dominio/rubros";
import { cambiarRubro } from "./actions";

export const dynamic = "force-dynamic";

export default async function RubroPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const empresa = await empresaActual();
  const actual = rubroDe(empresa.rubro);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧩 Rubro del negocio (plantilla)</h1>
      <p className="text-sm text-slate-500">
        Elige tu tipo de negocio: el sistema renombra las áreas y ajusta los módulos solo. El motor es el mismo.
      </p>

      {ok && (
        <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">
          ✓ Plantilla aplicada: {actual.emoji} {actual.nombre}
        </p>
      )}

      <form action={cambiarRubro} className="mt-5 space-y-4">
        <label className="block text-sm font-bold text-slate-700">
          Nombre del negocio
          <input
            name="nombre"
            defaultValue={empresa.nombre}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-slate-500"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {RUBROS_LISTA.map((r) => {
            const activo = r.id === actual.id;
            return (
              <label
                key={r.id}
                className={`cursor-pointer rounded-2xl border-2 p-4 shadow-sm transition ${activo ? "border-[#1479c4] bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <div className="flex items-center gap-3">
                  <input type="radio" name="rubro" value={r.id} defaultChecked={activo} className="h-4 w-4 accent-[#1479c4]" />
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="font-extrabold text-slate-900">{r.nombre}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>🏭 Producción → <b className="text-slate-700">{r.labels.produccion}</b></span>
                  <span>📦 Bodega → <b className="text-slate-700">{r.labels.bodega}</b></span>
                  <span>🍫 Sabores → <b className="text-slate-700">{r.labels.sabores}</b></span>
                  <span>🛒 Local → <b className="text-slate-700">{r.labels.caja}</b></span>
                  <span>🚚 Vendedor → <b className="text-slate-700">{r.labels.vendedor}</b></span>
                  <span>🧾 Retiros → <b className="text-slate-700">{r.labels.retiros}</b></span>
                </div>
                {r.ocultar.length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-400">Oculta: {r.ocultar.map((o) => o.replace("/admin/", "")).join(", ")}</p>
                )}
              </label>
            );
          })}
        </div>

        <button className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-110">
          Aplicar plantilla
        </button>
      </form>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        Cambiar el rubro solo renombra áreas y ajusta el menú. No borra ni mueve tus datos.
      </p>
    </div>
  );
}
