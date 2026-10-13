import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { inicioDelDia } from "@/lib/dominio/empresa";
import TrabajoVarioForm from "./TrabajoVarioForm";
import { borrarTrabajoVario } from "../actions";

export const dynamic = "force-dynamic";

const ICONO: Record<string, string> = { flete: "🚚", arreglo: "🔧", compra: "🛒", busqueda: "🔎", mantencion: "🧰", otro: "📌" };
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");

export default async function TrabajosVendedor() {
  const u = await usuarioActual();
  const hoy = await inicioDelDia();

  const trabajos = await prisma.trabajoVario.findMany({
    where: { fecha: { gte: hoy }, ...(u?.sub ? { usuarioId: u.sub } : {}) },
    orderBy: { fecha: "desc" },
    take: 100,
  });
  const totalMonto = trabajos.reduce((s, t) => s + Number(t.monto ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧰 Trabajos varios</h1>
        <p className="text-xs text-slate-500">Anota lo que hiciste en tu turno: fletes, arreglos, compras, búsquedas, mantención…</p>
      </div>

      <TrabajoVarioForm />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Hoy</h2>
          {totalMonto > 0 && <span className="text-xs font-semibold text-slate-400">{fmtCLP(totalMonto)}</span>}
        </div>
        {trabajos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no anotas trabajos hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {trabajos.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="text-slate-800">{ICONO[t.tipo] ?? "📌"} {t.descripcion}</span>
                  <span className="block text-[11px] text-slate-400">{t.tipo}{t.monto ? ` · ${fmtCLP(Number(t.monto))}` : ""} · {fmtHora(t.fecha)}</span>
                </span>
                <form action={borrarTrabajoVario}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="shrink-0 text-xs font-bold text-rose-500" aria-label="Borrar">✕</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Queda registrado y le llega al jefe en el reporte del día.</p>
      </section>
    </div>
  );
}
