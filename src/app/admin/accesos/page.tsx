import { prisma } from "@/lib/prisma";
import { parseAcceso } from "@/lib/dominio/accesos";

export const dynamic = "force-dynamic";

const APP_ICONO: Record<string, string> = {
  produccion: "🏭", bodega: "📦", caja: "🧾", vendedor: "📱", local: "🏪", admin: "📊",
};

const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function AccesosPage() {
  const accesos = await prisma.auditoria.findMany({
    where: { accion: "entrar", entidad: "acceso" },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Agrupa por día para leerlo fácil.
  const porDia = new Map<string, typeof accesos>();
  for (const a of accesos) {
    const k = new Date(a.createdAt).toLocaleDateString("es-CL");
    (porDia.get(k) ?? porDia.set(k, []).get(k)!).push(a);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🕑 Historial de movimiento</h1>
      <p className="text-sm text-slate-500">Quién entró a cada ventana (Socio, Higiene, etc.) y cuándo.</p>

      {accesos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay accesos registrados.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {[...porDia.entries()].map(([dia, items]) => (
            <section key={dia}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {fmtDia(items[0].createdAt)} · {items.length}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                {items.map((a) => {
                  const d = parseAcceso(a.detalle);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-lg">{APP_ICONO[d.app] ?? "📂"}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-800">{d.seccion}</span>
                          <span className="block text-xs text-slate-400">👤 {d.nombre} · {d.rol}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-400">{fmtHora(a.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
