import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import ProduccionForm from "./ProduccionForm";
import RecetaChecklist from "./RecetaChecklist";
import { fechaCorta } from "@/lib/dominio/agenda";
import { lineaLabel as lineaLbl } from "@/lib/dominio/produccion";
import { empresaActual } from "@/lib/dominio/empresa";
import { cumplirOrden, enviarReporteTurno, desbloquearRecetas, bloquearRecetas } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const lineaLabel: Record<string, string> = { trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", paleta: "Paletas", postre: "Postres" };

export default async function ProduccionHome({ searchParams }: { searchParams: Promise<{ ok?: string; reporte?: string; mezcla?: string; desbloqueo?: string }> }) {
  const { ok, reporte, mezcla, desbloqueo } = await searchParams;
  const empresa = await empresaActual();
  const secretas = new Set((empresa.recetasSecretas ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const hayClave = Boolean(empresa.recetaClave);
  const cookieStore = await cookies();
  const desbloqueado = cookieStore.get("recetas_ok")?.value === "1";
  // Tipos bloqueados = secretos y aún sin desbloquear.
  const lineasBloqueadas = [...secretas].filter(() => !desbloqueado);

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

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [sabores, ordenes, agendaFab, recetaItems, registroHoy, materiales] = await Promise.all([
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.ordenProduccion.findMany({
      where: { estado: { in: ["planificada", "en_proceso"] } },
      include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true, linea: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agenda.findMany({
      where: { tipo: { in: ["fabricar", "mezclar"] }, estado: { in: ["pendiente", "en_proceso"] } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
    prisma.recetaItem.findMany({
      where: { linea: { not: null } },
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" }, orderBy: { fecha: "desc" }, take: 100 }),
    prisma.materiaPrima.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, unidad: true, categoria: true } }),
  ]);

  const totalHoy = registroHoy.reduce((s, m) => s + m.cantidad, 0);

  // Receta base agrupada por tipo/línea (común a todos los sabores de ese tipo).
  const basePorLinea: Record<string, { id: string; nombre: string; unidad: string; cantidad: number }[]> = {};
  for (const ri of recetaItems) {
    if (!ri.linea) continue;
    (basePorLinea[ri.linea] ??= []).push({ id: ri.id, nombre: ri.materiaPrima.nombre, unidad: ri.materiaPrima.unidad, cantidad: ri.cantidad });
  }
  // Protege el secreto: no envía al cliente los insumos de tipos bloqueados.
  for (const l of lineasBloqueadas) delete basePorLinea[l];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción</h1>
        <p className="text-xs text-slate-500">Mira qué toca hacer, controla la receta y anota lo que salió.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Producción registrada</p>}
      {mezcla && <p className="rounded-xl bg-teal-100 px-4 py-3 text-center text-sm font-bold text-teal-700">✓ Mezcla confirmada · insumos descontados</p>}
      {reporte && <p className="rounded-xl bg-teal-100 px-4 py-3 text-center text-sm font-bold text-teal-700">✓ Reporte del turno enviado</p>}

      {/* 1 — ¿Qué produciré hoy? (órdenes + agendados) */}
      <section className="rounded-2xl border-2 border-teal-300 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-base font-extrabold text-teal-800">📋 ¿Qué produciré hoy?</h2>
        {ordenes.length === 0 && agendaFab.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            No hay órdenes ni agendados. Puedes producir libre más abajo.
          </p>
        )}
        {agendaFab.length > 0 && (
          <ul className="mb-2 space-y-1">
            {agendaFab.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">🗓️ {a.titulo}{a.notas ? ` — ${a.notas}` : ""}</span>
                <span className="ml-2 shrink-0 text-xs font-bold text-teal-700">{fechaCorta(a.fecha)}{a.cantidad ? ` · ${a.cantidad}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        {ordenes.length > 0 && (
          <ul className="space-y-2">
            {ordenes.map((o) => {
              const nombre = o.saborId
                ? `${o.sabor?.nombre ?? ""} · ${lineaLabel[o.sabor?.linea ?? ""] ?? o.sabor?.linea ?? ""}`
                : o.producto?.nombre ?? "Producto";
              return (
                <li key={o.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{nombre}</span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">Hacer {o.cantidadPlan}</span>
                  </div>
                  {o.notas && <p className="mt-0.5 text-xs text-slate-500">📝 {o.notas}</p>}
                  <form action={cumplirOrden} className="mt-2 flex items-end gap-2">
                    <input type="hidden" name="id" value={o.id} />
                    <label className="text-xs font-bold text-slate-600">Hice
                      <input type="number" name="cantidadReal" min="0" step="1" defaultValue={o.cantidadPlan} inputMode="numeric"
                        className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-slate-600">Merma
                      <input type="number" name="merma" min="0" step="1" defaultValue="0" inputMode="numeric"
                        className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                    </label>
                    <button className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white active:brightness-95">Cumplir</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 2 — Control de calidad (receta) */}
      <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-teal-800">🧪 Control de calidad — receta</h2>
        <p className="mb-2 text-xs text-slate-500">Receta base por tipo + agregados pesados. Marca lo que echaste y se descuenta solo.</p>

        {/* Recetas protegidas: desbloqueo con clave */}
        {hayClave && secretas.size > 0 && (
          <div className="mb-3">
            {desbloqueo === "0" && <p className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-center text-xs font-bold text-red-700">Clave incorrecta</p>}
            {desbloqueado ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-xs">
                <span className="font-semibold text-green-700">🔓 Recetas protegidas desbloqueadas</span>
                <form action={bloquearRecetas}><button className="font-semibold text-slate-500">bloquear</button></form>
              </div>
            ) : (
              <form action={desbloquearRecetas} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                <span className="text-sm">🔒</span>
                <input name="clave" type="password" inputMode="numeric" placeholder="Clave de recetas protegidas" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white">Desbloquear</button>
              </form>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Protegidas: {[...secretas].map((l) => lineaLbl[l] ?? l).join(", ")}.
            </p>
          </div>
        )}

        <RecetaChecklist basePorLinea={basePorLinea} materiales={materiales} lineasBloqueadas={lineasBloqueadas} />
      </section>

      {/* 3 — Anota lo que hiciste (voz o escrito) */}
      <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-teal-800">✍️ Anota lo que hiciste</h2>
        <p className="mb-2 text-xs text-slate-500">Cuántos salieron por tipo o sabor — por voz o escrito.</p>
        <ProduccionForm sabores={sabores.map((s) => ({ id: s.id, nombre: s.nombre, linea: s.linea }))} />
      </section>

      {/* Reporte del turno */}
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
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {registroHoy.length > 0 && (
          <form action={enviarReporteTurno} className="mt-3">
            <button className="w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white active:brightness-110">
              ✅ Enviar reporte del turno
            </button>
          </form>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo del día. Los totales y las ventas del mes se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
