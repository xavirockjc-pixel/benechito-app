import { prisma } from "@/lib/prisma";
import MateriaPickerOperario from "@/app/_shared/MateriaPickerOperario";
import { ingresarMateriaOperario } from "@/app/_shared/materias-operario";
import { fmtCant } from "@/lib/dominio/materias";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function BodegaInsumos() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [materiales, registro] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, categoria: true },
    }),
    // Solo las entradas de HOY, con su nombre (registro del día). Sin totales.
    prisma.movimientoMateria.findMany({
      where: { tipo: "entrada", fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
      take: 60,
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">🧪 Ingreso de insumos</h1>
      <p className="text-sm text-slate-500">Registra lo que llega (materias primas y materiales). Solo ves lo del día.</p>

      <div className="mt-4">
        <MateriaPickerOperario materiales={materiales} accion={ingresarMateriaOperario} etiqueta="➕ Ingresar" color="#b45309" />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Ingresado hoy ({registro.length})</h2>
      {registro.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no ingresas insumos hoy.
        </p>
      ) : (
        <ul className="space-y-1">
          {registro.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0 truncate">
                <span className="font-bold text-[#b45309]">+{fmtCant(m.cantidad, m.materiaPrima.unidad)}</span>{" "}
                <span className="text-slate-800">{m.materiaPrima.nombre}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-tight text-slate-400">
        El total de insumos y los costos se ven únicamente en la central.
      </p>
    </div>
  );
}
