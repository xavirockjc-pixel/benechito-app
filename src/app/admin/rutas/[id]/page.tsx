import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estadoRutaLabel, estadoRutaColor, ESTADOS_RUTA, estadoParadaLabel, estadoParadaColor } from "@/lib/dominio/ruta";
import { asignarVendedor, agregarParada, quitarParada, cambiarEstadoRuta, eliminarRuta, agregarSector, agregarRezagados } from "../actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const inputCls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500";

export default async function FichaRuta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruta = await prisma.ruta.findUnique({
    where: { id },
    include: {
      vendedor: { select: { nombre: true } },
      paradas: { include: { negocio: { select: { nombreNegocio: true, comuna: true } } }, orderBy: { orden: "asc" } },
    },
  });
  if (!ruta) notFound();

  const hoyDate = new Date();
  const [vendedores, clientes, rezagadosN] = await Promise.all([
    prisma.usuario.findMany({ where: { rol: { in: ["vendedor", "chofer"] }, activo: true }, orderBy: { nombre: "asc" } }),
    prisma.negocio.findMany({ orderBy: { nombreNegocio: "asc" }, select: { id: true, nombreNegocio: true, comuna: true, sector: true } }),
    prisma.negocio.count({ where: { estado: { in: ["punto_activo", "reposicion"] }, proximaReposicion: { lte: hoyDate } } }),
  ]);

  const enRuta = new Set(ruta.paradas.map((p) => p.negocioId));
  const disponibles = clientes.filter((c) => !enRuta.has(c.id));
  // Sectores disponibles (usa sector; si no, la comuna).
  const sectores = [...new Set(clientes.map((c) => c.sector || c.comuna).filter(Boolean))].sort() as string[];
  const c = estadoRutaColor[ruta.estado];
  const hechas = ruta.paradas.filter((p) => p.estado !== "pendiente").length;

  return (
    <div>
      <Link href="/admin/rutas" className="text-sm font-semibold text-naranja">← Rutas</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{ruta.nombre ?? "Ruta"}</h1>
          <p className="text-sm text-slate-500">{fmtFecha(ruta.fecha)} · {hechas}/{ruta.paradas.length} paradas</p>
        </div>
        <span className="rounded-md px-3 py-1.5 text-sm font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
          {estadoRutaLabel[ruta.estado] ?? ruta.estado}
        </span>
      </div>

      {/* Vendedor + estado */}
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={asignarVendedor} className="flex items-end gap-2">
          <input type="hidden" name="rutaId" value={ruta.id} />
          <label className="text-xs font-bold text-slate-600">Vendedor
            <select name="vendedorId" defaultValue={ruta.vendedorId ?? ""} className={`mt-1 block ${inputCls}`}>
              <option value="">Sin asignar</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Guardar</button>
        </form>

        <form action={cambiarEstadoRuta} className="flex items-end gap-2">
          <input type="hidden" name="rutaId" value={ruta.id} />
          <label className="text-xs font-bold text-slate-600">Estado
            <select name="estado" defaultValue={ruta.estado} className={`mt-1 block ${inputCls}`}>
              {ESTADOS_RUTA.map((e) => <option key={e} value={e}>{estadoRutaLabel[e]}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Actualizar</button>
        </form>
      </div>

      {/* Paradas */}
      <h2 className="mt-6 mb-2 text-lg font-bold text-slate-900">Paradas</h2>
      <div className="space-y-2">
        {ruta.paradas.map((p, i) => {
          const pc = estadoParadaColor[p.estado];
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-bold text-white">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{p.negocio.nombreNegocio}</span>
                <span className="block text-xs text-slate-400">{p.negocio.comuna}</span>
              </span>
              <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: pc?.color, backgroundColor: pc?.bg }}>
                {estadoParadaLabel[p.estado] ?? p.estado}
              </span>
              <form action={quitarParada}>
                <input type="hidden" name="paradaId" value={p.id} />
                <input type="hidden" name="rutaId" value={ruta.id} />
                <button className="text-xs text-rojo/60 hover:text-rojo">✕</button>
              </form>
            </div>
          );
        })}
        {ruta.paradas.length === 0 && <p className="text-sm text-slate-500">Sin paradas. Agrega clientes abajo.</p>}
      </div>

      {/* Agregar por SECTOR (todos los de ese sector) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form action={agregarSector} className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <input type="hidden" name="rutaId" value={ruta.id} />
          <label className="flex-1 text-xs font-bold text-slate-600">🗺️ Agregar todo un sector
            <select name="sector" defaultValue="" className={`mt-1 block w-full ${inputCls}`}>
              <option value="">Elegir sector…</option>
              {sectores.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white">Agregar</button>
        </form>

        {/* Rezagados */}
        <form action={agregarRezagados} className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <input type="hidden" name="rutaId" value={ruta.id} />
          <span className="text-sm font-bold text-amber-800">⏳ Rezagados <span className="font-normal">({rezagadosN})</span><br /><span className="text-[11px] font-normal text-amber-700">con reposición vencida</span></span>
          <button disabled={rezagadosN === 0} className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Agregar todos</button>
        </form>
      </div>

      {/* Agregar un cliente puntual */}
      {disponibles.length > 0 && (
        <form action={agregarParada} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="rutaId" value={ruta.id} />
          <label className="text-xs font-bold text-slate-600">Agregar un cliente
            <select name="negocioId" defaultValue="" className={`mt-1 block ${inputCls}`}>
              <option value="">Selecciona…</option>
              {disponibles.map((c) => <option key={c.id} value={c.id}>{c.nombreNegocio} · {c.sector || c.comuna}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white">Agregar</button>
        </form>
      )}

      <form action={eliminarRuta} className="mt-6">
        <input type="hidden" name="rutaId" value={ruta.id} />
        <button className="text-sm font-semibold text-rojo/70 hover:text-rojo">Eliminar ruta</button>
      </form>
    </div>
  );
}
