import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { CARGOS, cargoLabel, cargoIcono } from "@/lib/dominio/equipo";
import { crearTrabajador } from "./actions";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const inicioSemana = new Date();
  const dia = (inicioSemana.getDay() + 6) % 7; // lunes = 0
  inicioSemana.setDate(inicioSemana.getDate() - dia);
  inicioSemana.setHours(0, 0, 0, 0);

  const trabajadores = await prisma.trabajador.findMany({
    orderBy: [{ activo: "desc" }, { cargo: "asc" }, { nombre: "asc" }],
    include: {
      asistencias: { where: { fecha: { gte: inicioSemana } } },
      movimientos: { where: { fecha: { gte: inicioSemana } } },
    },
  });

  const filas = trabajadores.map((t) => {
    const horas = t.asistencias.reduce((s, a) => s + a.horas + a.horasExtra, 0);
    const pagadoSemana = t.movimientos.filter((m) => m.tipo === "pago" || m.tipo === "adelanto").reduce((s, m) => s + Number(m.monto), 0);
    return { t, horas, pagadoSemana };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">👥 Equipo</h1>
      <p className="text-sm text-slate-500">Asistencia, producción/ventas y la cuenta de cada trabajador. (Los sueldos legales los hace tu contador.)</p>

      {/* Agregar */}
      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">➕ Nuevo trabajador</summary>
        <form action={crearTrabajador} className="mt-3 grid grid-cols-2 gap-2">
          <input name="nombre" required placeholder="Nombre" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-xs font-bold text-slate-600">Cargo
            <select name="cargo" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {CARGOS.map((c) => <option key={c} value={c}>{cargoLabel[c]}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Valor hora (referencia)
            <input name="valorHora" inputMode="numeric" placeholder="opcional" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="col-span-2 rounded-lg bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:scale-95">Crear trabajador</button>
        </form>
      </details>

      {/* Lista */}
      {filas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aún no hay trabajadores. Crea el primero.</p>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Esta semana</p>
          {filas.map(({ t, horas, pagadoSemana }) => (
            <Link key={t.id} href={`/admin/equipo/${t.id}`} className={`flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${t.activo ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-900">{cargoIcono[t.cargo]} {t.nombre}</p>
                <p className="text-xs text-slate-500">{cargoLabel[t.cargo] ?? t.cargo}{!t.activo ? " · inactivo" : ""}</p>
              </div>
              <div className="flex shrink-0 gap-4 text-right">
                <div><p className="text-sm font-extrabold text-slate-900">{horas.toFixed(1).replace(/\.0$/, "")} h</p><p className="text-[10px] uppercase text-slate-400">horas</p></div>
                <div><p className="text-sm font-extrabold text-green-700">{fmtCLP(pagadoSemana)}</p><p className="text-[10px] uppercase text-slate-400">pagado</p></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
