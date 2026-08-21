import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estadoOPLabel, estadoOPColor } from "@/lib/dominio/produccion";
import { iniciarOP, terminarOP, eliminarOP } from "../actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date | null) =>
  d ? new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500";

export default async function FichaOP({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const op = await prisma.ordenProduccion.findUnique({
    where: { id },
    include: {
      producto: { select: { nombre: true } },
      sabor: { select: { nombre: true } },
      ubicacionDestino: { select: { nombre: true } },
    },
  });
  if (!op) notFound();
  const objetivoNombre = op.producto?.nombre ?? op.sabor?.nombre ?? "—";
  const esSabor = Boolean(op.saborId);

  const bodegas = await prisma.ubicacion.findMany({ where: { tipo: "bodega", activo: true }, orderBy: { nombre: "asc" } });
  const c = estadoOPColor[op.estado];
  const terminada = op.estado === "terminada";

  return (
    <div>
      <Link href="/admin/produccion" className="text-sm font-semibold text-naranja">← Producción</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {objetivoNombre}
            {esSabor && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">sabor</span>}
          </h1>
          <p className="text-sm text-slate-500">
            Plan: {op.cantidadPlan} u.{op.lote ? ` · lote ${op.lote}` : ""}{op.responsable ? ` · ${op.responsable}` : ""}
          </p>
        </div>
        <span className="rounded-md px-3 py-1.5 text-sm font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
          {estadoOPLabel[op.estado] ?? op.estado}
        </span>
      </div>

      {op.notas && <p className="mt-2 text-sm text-slate-600">{op.notas}</p>}

      {/* Acciones según estado */}
      {!terminada ? (
        <div className="mt-5 space-y-4">
          {op.estado === "planificada" && (
            <form action={iniciarOP}>
              <input type="hidden" name="id" value={op.id} />
              <button className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105">
                ▶️ Iniciar producción
              </button>
            </form>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Terminar y guardar en bodega</h2>
            <form action={terminarOP} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
              <input type="hidden" name="id" value={op.id} />
              <label className="text-sm font-bold text-slate-700">Producido (real)
                <input type="number" name="cantidadReal" min="0" step="1" defaultValue={op.cantidadPlan} required inputMode="numeric" className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm font-bold text-slate-700">Merma
                <input type="number" name="merma" min="0" step="1" defaultValue="0" inputMode="numeric" className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm font-bold text-slate-700">Ingresar a
                <select name="ubicacionDestinoId" defaultValue="" className={`mt-1 ${inputCls}`}>
                  <option value="">Bodega (por defecto)</option>
                  {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </label>
              <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">
                ✅ Terminar
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">Lo producido entra al stock de bodega; la merma solo se registra.</p>
          </section>
        </div>
      ) : (
        <section className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
          <h2 className="mb-2 text-lg font-bold text-green-800">Producción terminada ✓</h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Dato label="Producido" valor={`${op.cantidadReal ?? 0} u.`} />
            <Dato label="Merma" valor={`${op.merma} u.`} />
            <Dato label="Ingresó a" valor={op.ubicacionDestino?.nombre ?? "—"} />
            <Dato label="Fecha" valor={fmtHora(op.fechaTermino)} />
          </div>
        </section>
      )}

      <form action={eliminarOP} className="mt-5">
        <input type="hidden" name="id" value={op.id} />
        <button className="text-sm font-semibold text-rojo/70 hover:text-rojo">Eliminar orden</button>
      </form>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-green-700">{label}</p>
      <p className="font-bold text-green-900">{valor}</p>
    </div>
  );
}
