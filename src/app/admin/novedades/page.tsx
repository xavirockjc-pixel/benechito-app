import { prisma } from "@/lib/prisma";
import NuevaNovedad from "./NuevaNovedad";
import { toggleNovedad, eliminarNovedad } from "./actions";

export const dynamic = "force-dynamic";

const tipoMeta: Record<string, { label: string; icono: string; color: string }> = {
  promo: { label: "Promoción", icono: "🔥", color: "#e23b2c" },
  nuevo: { label: "Nuevo producto", icono: "✨", color: "#1479c4" },
  sabor: { label: "Nuevo sabor", icono: "🍦", color: "#0f766e" },
};

export default async function NovedadesPage() {
  const novedades = await prisma.novedad.findMany({ orderBy: [{ activo: "desc" }, { createdAt: "desc" }] });
  const activas = novedades.filter((n) => n.activo).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">🔥 Novedades & Promos</h1>
        <p className="text-sm text-slate-500">Lo que publiques aquí lo ven tus clientes en su portal “Mi Benechito”. Promos, nuevos productos y sabores.</p>
      </div>

      <div className="mt-4">
        <NuevaNovedad />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Publicadas</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{activas} activas · {novedades.length} total</span>
      </div>

      {novedades.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aún no publicas novedades. Crea la primera arriba. 👆</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {novedades.map((n) => {
            const m = tipoMeta[n.tipo] ?? tipoMeta.promo;
            return (
              <div key={n.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${n.activo ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
                {n.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.fotoUrl} alt={n.titulo} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-4xl" style={{ backgroundColor: `${m.color}18` }}>{m.icono}</div>
                )}
                <div className="p-3">
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.icono} {m.label}</span>
                  <p className="mt-1.5 font-bold text-slate-900">{n.titulo}</p>
                  {n.descripcion && <p className="text-sm text-slate-500">{n.descripcion}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <form action={toggleNovedad}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className={`rounded-lg px-3 py-1.5 text-xs font-bold ${n.activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {n.activo ? "✓ Activa" : "Activar"}
                      </button>
                    </form>
                    <form action={eliminarNovedad} className="ml-auto">
                      <input type="hidden" name="id" value={n.id} />
                      <button className="text-xs font-semibold text-red-500">Eliminar</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
