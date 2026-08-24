import { prisma } from "@/lib/prisma";
import MateriaPickerOperario from "@/app/_shared/MateriaPickerOperario";
import { consumirMateriaOperario } from "@/app/_shared/materias-operario";
import { fmtCant } from "@/lib/dominio/materias";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function ProduccionInsumos() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [materiales, registro] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, categoria: true },
    }),
    prisma.movimientoMateria.findMany({
      where: { tipo: "consumo", fecha: { gte: hoy } },
      orderBy: { fecha: "desc" },
      take: 60,
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">🧪 Consumo de insumos</h1>
      <p className="text-sm text-slate-500">
        Si un producto tiene receta, se descuenta solo al fabricar. Acá anotas lo que gastes a mano.
      </p>

      <div className="mt-4">
        <MateriaPickerOperario materiales={materiales} accion={consumirMateriaOperario} etiqueta="➖ Consumir" color="#0f766e" />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Consumido hoy ({registro.length})</h2>
      {registro.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Sin consumos manuales hoy.
        </p>
      ) : (
        <ul className="space-y-1">
          {registro.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0 truncate">
                <span className="font-bold text-[#0f766e]">−{fmtCant(m.cantidad, m.materiaPrima.unidad)}</span>{" "}
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
