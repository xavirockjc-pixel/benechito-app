import { AREAS_REINICIO, contarAreas } from "@/lib/dominio/reinicio";
import { reiniciar } from "./actions";
import ReiniciarForm from "./ReiniciarForm";

export const dynamic = "force-dynamic";

export default async function ReiniciarPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const counts = await contarAreas();
  const areas = AREAS_REINICIO.map((a) => ({ ...a, count: counts[a.id] ?? 0 }));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900">Empezar de cero (reiniciar números)</h1>
      <p className="mt-1 text-sm text-slate-500">
        Deja en cero los <b>números</b> de las secciones que elijas para partir limpio. Úsalo para arrancar un nuevo
        período o si algo se desconfiguró. <b>No borra</b> catálogo, precios, clientes, usuarios, equipo, recetas ni
        insumos definidos — solo los movimientos y deja los stocks en 0.
      </p>

      {ok && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-bold text-green-700 ring-1 ring-green-200">✅ Listo. Se reiniciaron {ok} sección(es). Ya puedes empezar de cero.</p>}
      {error && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200">Marca al menos una sección y escribe <b>REINICIAR</b> para confirmar.</p>}

      <div className="mt-5">
        <ReiniciarForm action={reiniciar} areas={areas} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-bold text-slate-700">💡 Recomendación</p>
        <p className="mt-1">Antes de arrancar el lunes, marca las secciones que empezarás a llenar (por ejemplo <b>Ventas, Bodega, Producción</b>) y reinícialas. Luego cargas el stock inicial y a operar. Esta acción no se puede deshacer, por eso pide confirmación escrita.</p>
      </div>
    </div>
  );
}
