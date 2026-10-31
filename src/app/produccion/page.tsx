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

  const empresa = await prisma.empresa.findFirst({ select: { pinesProduccion: true } });
  let pines: Record<string, string> = {};
  try { pines = empresa?.pinesProduccion ? JSON.parse(empresa.pinesProduccion) : {}; } catch { pines = {}; }

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
  // Resumen de hoy POR PERSONA (compacto, para no mostrar el listado largo).
  const porPersonaHoy = new Map<string, number>();
  for (const m of registroHoy) {
    const quien = (m.detalle || "Sin nombre").trim();
    porPersonaHoy.set(quien, (porPersonaHoy.get(quien) ?? 0) + m.cantidad);
  }

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
      <ProduccionForm saboresPorLinea={saboresProd} equipo={equipoTrato} recomendaciones={recomendaciones} pines={pines} />

      {/* Producido hoy (resumen compacto por persona) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Producido hoy</h2>
          {totalHoy > 0 && <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-extrabold text-teal-700">{totalHoy} u.</span>}
        </div>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras producción hoy.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {[...porPersonaHoy.entries()].sort((a, b) => b[1] - a[1]).map(([quien, cant]) => (
              <li key={quien} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-800">👤 {quien}</span>
                <span className="font-extrabold text-teal-700">{cant} u.</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Calendario / registro por día, semana y mes (quién fabricó cuántos) */}
      <Link href="/produccion/registro" className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-4 text-white shadow active:brightness-110">
        <span className="min-w-0">
          <span className="block text-sm font-extrabold">📅 Registro / calendario</span>
          <span className="block text-[11px] font-semibold text-slate-300">Por día, semana y mes · quién fabricó cuántos</span>
        </span>
        <span className="text-xl">›</span>
      </Link>
    </div>
  );
}
