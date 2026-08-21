import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { estadoRutaLabel, estadoRutaColor } from "@/lib/dominio/ruta";
import { crearRuta } from "./actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const hoyISO = () => new Date().toISOString().slice(0, 10);
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500";

export default async function RutasPage() {
  const [clientes, vendedores, rutas] = await Promise.all([
    prisma.negocio.findMany({ orderBy: { nombreNegocio: "asc" }, select: { id: true, nombreNegocio: true, comuna: true } }),
    prisma.usuario.findMany({ where: { rol: { in: ["vendedor", "chofer"] }, activo: true }, orderBy: { nombre: "asc" } }),
    prisma.ruta.findMany({
      orderBy: { fecha: "desc" },
      take: 30,
      include: {
        vendedor: { select: { nombre: true } },
        paradas: { select: { estado: true } },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Rutas</h1>
      <p className="text-sm text-slate-500">Organiza la ruta del día y asígnala a un vendedor. Él la ejecuta desde su app.</p>

      {/* Crear ruta */}
      <form action={crearRuta} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Nueva ruta</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">Nombre (opcional)
            <input name="nombre" placeholder="Ruta Coronel" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Fecha
            <input type="date" name="fecha" defaultValue={hoyISO()} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Vendedor
            <select name="vendedorId" defaultValue="" className={`mt-1 ${inputCls}`}>
              <option value="">Sin asignar</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </label>
        </div>

        <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Clientes de la ruta</p>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {clientes.map((c) => (
            <label key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <input type="checkbox" name="negocioIds" value={c.id} className="h-4 w-4 accent-[#1479c4]" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {c.nombreNegocio} <span className="font-normal text-slate-400">· {c.comuna}</span>
              </span>
            </label>
          ))}
        </div>

        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
          Crear ruta
        </button>
      </form>

      {/* Lista de rutas */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Rutas recientes</h2>
      {rutas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay rutas.</p>
      ) : (
        <div className="space-y-2">
          {rutas.map((r) => {
            const c = estadoRutaColor[r.estado];
            const hechas = r.paradas.filter((p) => p.estado !== "pendiente").length;
            return (
              <Link key={r.id} href={`/admin/rutas/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-naranja">
                <div>
                  <p className="font-bold text-slate-900">{r.nombre ?? "Ruta"} · {fmtFecha(r.fecha)}</p>
                  <p className="text-xs text-slate-500">
                    {r.vendedor?.nombre ?? "Sin vendedor"} · {hechas}/{r.paradas.length} paradas
                  </p>
                </div>
                <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
                  {estadoRutaLabel[r.estado] ?? r.estado}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
