import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProduccionForm from "./ProduccionForm";
import { inicioDelDia } from "@/lib/dominio/empresa";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function ProduccionHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  if (!bodega) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Producción</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay una bodega configurada. Créala en el panel (Inventario → Ubicaciones).
        </p>
      </div>
    );
  }

  const hoy = await inicioDelDia();

  const [registroHoy, saboresAll, equipoTratoRaw, recs] = await Promise.all([
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" }, orderBy: { fecha: "desc" }, take: 100 }),
    prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true, linea: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({
      // Tablet compartido: cualquier trabajador de producción puede registrar su producción por su nombre.
      where: { activo: true, cargo: { in: ["operario", "otro"] } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.recomendacionProduccion.findMany({ where: { activo: true }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  const saboresPorLinea: Record<string, string[]> = {};
  for (const s of saboresAll) (saboresPorLinea[s.linea] ??= []).push(s.nombre);
  const saboresProd: Record<string, string[]> = {};
  for (const l of ["tuyyo", "paletas", "cremas", "paletas_premium", "postres_500", "cassatas", "trufas", "cuchufli"]) {
    const alias = l === "trufas" ? ["trufas", "trufa"] : [l];
    saboresProd[l] = [...new Set(alias.flatMap((a) => saboresPorLinea[a] ?? []))];
  }
  // Recomendaciones de la central por producto (más las de "todos" bajo la clave __todas__).
  const recomendaciones: Record<string, string[]> = {};
  for (const r of recs) (recomendaciones[r.linea ?? "__todas__"] ??= []).push(r.texto);
  const equipoTrato = equipoTratoRaw.map((t) => ({ id: t.id, nombre: t.nombre }));
  const totalHoy = registroHoy.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción</h1>
        <p className="text-xs text-slate-500">Anota el reporte del turno. Simple y rápido.</p>
      </div>

      <Link href="/produccion/mantenimiento" className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 px-4 py-3 text-amber-950 shadow-sm active:opacity-90">
        <span className="text-2xl">🐝</span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold">Socio Benechito · Mantenimiento</span>
          <span className="block text-[11px] font-semibold leading-tight">Pendientes, mejoras y recordatorios. Anota lo que falta.</span>
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/produccion/checklist" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm active:bg-slate-50">
          🧼 Higiene y BPM
        </Link>
        <Link href="/produccion/bitacora" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm active:bg-slate-50">
          📓 Bitácora
        </Link>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Guardado. ¡Gracias! Toca otro producto para seguir.</p>}

      {/* Reporte por producto (elige → ventana del producto → guarda → ← Volver) */}
      <ProduccionForm saboresPorLinea={saboresProd} equipo={equipoTrato} recomendaciones={recomendaciones} />

      {/* Producido hoy (resumen) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Producido hoy</h2>
          {totalHoy > 0 && <span className="text-xs font-semibold text-slate-400">{totalHoy} u.</span>}
        </div>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras producción hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registroHoy.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0">
                  <span className="font-bold text-teal-700">+{m.cantidad}</span>{" "}
                  <span className="text-slate-800">{m.nombre}</span>
                  {m.detalle && <span className="block text-[11px] font-semibold text-[#0f766e]">👤 {m.detalle}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo del día. Los totales, costos y pagos se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
