import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanales } from "@/lib/dominio/canales";
import {
  TIPOS_GASTO, tipoGastoLabel, tipoGastoIcono, CHECKLIST_VEHICULO, ESTADOS_REVISION,
  estadoRevisionLabel, estadoRevisionColor,
} from "@/lib/dominio/vehiculo";
import { registrarGastoVehiculo, guardarRevisionVehiculo } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function VehiculoPage() {
  const u = await usuarioActual();
  const usuario = u?.sub ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } }) : null;
  const vehiculoId = usuario?.vehiculoId ?? null;
  const vehiculo = vehiculoId ? await prisma.ubicacion.findUnique({ where: { id: vehiculoId }, select: { nombre: true } }) : null;

  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const [gastos, ultimaRevision, canales] = await Promise.all([
    prisma.gastoVehiculo.findMany({
      where: { fecha: { gte: inicioMes }, ...(vehiculoId ? { vehiculoId } : {}) },
      orderBy: { fecha: "desc" }, take: 40,
    }),
    prisma.revisionVehiculo.findFirst({ where: vehiculoId ? { vehiculoId } : {}, orderBy: { fecha: "desc" } }),
    getCanales(true),
  ]);

  const combMes = gastos.filter((g) => g.tipo === "combustible").reduce((s, g) => s + Number(g.monto), 0);
  const otrosMes = gastos.filter((g) => g.tipo !== "combustible").reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Inicio</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">🚚 Mi vehículo</h1>
        <p className="text-xs text-slate-500">{vehiculo?.nombre ?? "Sin vehículo asignado"} · gastos y revisión del reparto.</p>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-lg font-extrabold text-[#b45309]">{fmtCLP(combMes)}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Combustible (mes)</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-lg font-extrabold text-slate-900">{fmtCLP(otrosMes)}</p><p className="text-[10px] uppercase tracking-wide text-slate-400">Otros gastos (mes)</p></div>
      </div>

      {/* Checklist / revisión */}
      <section className="rounded-2xl border-2 border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-base font-extrabold text-teal-800">✅ Revisión del vehículo</h2>
        <p className="mb-3 text-xs text-slate-500">Antes de salir: revisa niveles, neumáticos y anota los km.</p>
        <form action={guardarRevisionVehiculo} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Km de salida
              <input name="kmSalida" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Km de entrada (al volver)
              <input name="kmEntrada" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>
          <div className="space-y-1.5">
            {CHECKLIST_VEHICULO.map((it) => (
              <div key={it.campo} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{it.icono} {it.label}</span>
                <select name={it.campo} defaultValue="ok" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  {ESTADOS_REVISION.map((e) => <option key={e} value={e}>{estadoRevisionLabel[e]}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label className="block text-xs font-bold text-slate-600">Observaciones
            <textarea name="observaciones" rows={2} placeholder="Ej: falta aire rueda trasera" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button className="w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white active:scale-95">Guardar revisión</button>
        </form>

        {ultimaRevision && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">
            <p className="font-bold text-slate-600">Última revisión · {fmtHora(ultimaRevision.fecha)}{ultimaRevision.kmSalida > 0 ? ` · km salida ${ultimaRevision.kmSalida}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CHECKLIST_VEHICULO.map((it) => {
                const est = (ultimaRevision as unknown as Record<string, string>)[it.campo] ?? "ok";
                return <span key={it.campo} className="rounded px-1.5 py-0.5 font-bold" style={{ color: estadoRevisionColor[est], backgroundColor: `${estadoRevisionColor[est]}18` }}>{it.icono} {estadoRevisionLabel[est]}</span>;
              })}
            </div>
          </div>
        )}
      </section>

      {/* Gastos: combustible + otros */}
      <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-base font-extrabold text-amber-800">⛽ Combustible y gastos</h2>
        <p className="mb-3 text-xs text-slate-500">Anota lo que gastas en el vehículo.</p>
        <form action={registrarGastoVehiculo} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Tipo
              <select name="tipo" defaultValue="combustible" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm">
                {TIPOS_GASTO.map((t) => <option key={t} value={t}>{tipoGastoIcono[t]} {tipoGastoLabel[t]}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Monto $
              <input name="monto" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Litros (si es combustible)
              <input name="litros" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Canal / ruta
              <select name="canal" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-sm">
                <option value="">—</option>
                {canales.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
              </select>
            </label>
          </div>
          <input name="notas" placeholder="Notas (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="w-full rounded-xl bg-[#d97706] py-3 text-base font-extrabold text-white active:scale-95">➕ Registrar gasto</button>
        </form>

        {gastos.length > 0 && (
          <ul className="mt-3 space-y-1">
            {gastos.slice(0, 15).map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{tipoGastoIcono[g.tipo]} {tipoGastoLabel[g.tipo] ?? g.tipo}{g.litros > 0 ? ` · ${g.litros} L` : ""}{g.notas ? ` · ${g.notas}` : ""}</span>
                <span className="shrink-0 font-bold text-slate-800">{fmtCLP(Number(g.monto))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
