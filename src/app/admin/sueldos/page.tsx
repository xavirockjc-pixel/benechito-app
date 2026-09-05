import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cargoIcono, cargoLabel } from "@/lib/dominio/equipo";
import { liquidar, rangoPeriodo, MODALIDADES_PAGO, modalidadLabel, tarifaLabel } from "@/lib/dominio/sueldos";
import { setModalidad, registrarPagoLiquido, crearTarifaTrato, actualizarTarifaTrato, eliminarTarifaTrato, cargarTarifasEjemplo } from "./actions";
import RegistrarTratoForm from "./RegistrarTratoForm";
import CopiarBtn from "@/components/CopiarBtn";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);

export default async function SueldosPage({ searchParams }: { searchParams: Promise<{ periodo?: string; off?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo === "mes" ? "mes" : "semana";
  const off = Number.isFinite(Number(sp.off)) ? parseInt(sp.off ?? "0", 10) : 0;
  const { inicio, fin, label, semanas, esSemana } = rangoPeriodo(periodo, off);

  const [trabajadores, tarifasRaw] = await Promise.all([
    prisma.trabajador.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      include: {
        asistencias: { where: { fecha: { gte: inicio, lt: fin } }, select: { horas: true, presente: true } },
        movimientos: { where: { fecha: { gte: inicio, lt: fin } }, select: { tipo: true, monto: true } },
      },
    }),
    prisma.tarifaTrato.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);
  const tarifas = tarifasRaw.map((t) => ({ id: t.id, nombre: t.nombre, valorUnit: Number(t.valorUnit) }));

  const filas = trabajadores.map((t) => {
    const dias = t.asistencias.filter((a) => a.presente).length;
    const horas = t.asistencias.reduce((s, a) => s + a.horas, 0);
    const movimientos = t.movimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }));
    const tratoMonto = movimientos.filter((m) => m.tipo === "trato").reduce((s, m) => s + m.monto, 0);
    const pagado = movimientos.filter((m) => m.tipo === "pago").reduce((s, m) => s + m.monto, 0);
    // tarifa con retrocompatibilidad
    const tarifa = t.tarifa != null
      ? Number(t.tarifa)
      : t.modalidadPago === "por_hora" ? num(t.valorHora)
      : t.modalidadPago === "mensual" ? num(t.sueldoBase) : 0;
    const liq = liquidar({ modalidad: t.modalidadPago, tarifa, dias, horas, semanas, tratoMonto, movimientos });
    return { t, liq, pagado, dias, horas };
  });

  const costoTotal = filas.reduce((s, f) => s + f.liq.liquido, 0);

  const qs = (patch: { periodo?: string; off?: number }) => {
    const p = patch.periodo ?? periodo;
    const o = patch.off ?? off;
    return `/admin/sueldos?periodo=${p}&off=${o}`;
  };

  const exportTexto =
    `PAGOS AL EQUIPO ${label.toUpperCase()} (${esSemana ? "semana" : "mes"})\n` +
    filas.map((f) => `${f.t.nombre} [${modalidadLabel[f.t.modalidadPago]}]: ${f.liq.detalleBase} = ${CLP(f.liq.base)}  ·  +extras ${CLP(f.liq.extrasBonos)} −adel/desc ${CLP(f.liq.descuentosAdelantos)}  →  A PAGAR ${CLP(f.liq.liquido)}`).join("\n") +
    `\n----------------------------------------\nTOTAL: ${CLP(costoTotal)}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">💵 Pagos al equipo</h1>
          <p className="text-sm text-slate-500">El sistema calcula cuánto pagar según la forma de cada uno (semana, día, hora, jornada o trato) y tú registras el pago.</p>
        </div>
        <CopiarBtn texto={exportTexto} label="📋 Copiar para el contador" />
      </div>

      {/* Toggle semana/mes */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link href={qs({ periodo: "semana", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Semana</Link>
        <Link href={qs({ periodo: "mes", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${!esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Mes</Link>
      </div>
      {/* Nav del período */}
      <div className="mt-2 flex items-center justify-center gap-3">
        <Link href={qs({ off: off - 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[11rem] text-center text-sm font-extrabold capitalize text-slate-800">{label}</span>
        <Link href={qs({ off: off + 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">→</Link>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Kpi label={`Total a pagar (${esSemana ? "semana" : "mes"})`} valor={CLP(costoTotal)} color="#e23b2c" />
        <Kpi label="Trabajadores" valor={String(filas.length)} color="#1479c4" />
      </div>

      <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        💡 Es un <b>registro de pagos</b>: el monto calculado es una <b>sugerencia</b> según la forma de cada persona (lo puedes ajustar al pagar). Una <b>jornada = 6 h</b>; el <b>trato</b> suma lo que registres (cantidad × valor). Para quienes sí están <b>contratados</b>, las imposiciones (AFP/salud/Previred) van aparte con tu contador.
      </p>

      {/* Filas */}
      <div className="mt-4 space-y-3">
        {filas.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No hay trabajadores activos. Agrégalos en <Link href="/admin/equipo" className="font-semibold text-slate-600 underline">Equipo</Link>.</p>}
        {filas.map(({ t, liq, pagado, dias, horas }) => {
          const sinTarifa = t.tarifa == null && t.modalidadPago !== "por_trato" && !(t.modalidadPago === "por_hora" && t.valorHora) && !(t.modalidadPago === "mensual" && t.sueldoBase);
          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{cargoIcono[t.cargo] ?? "👤"} {t.nombre} <span className="text-xs font-semibold text-slate-400">{cargoLabel[t.cargo] ?? t.cargo}</span></p>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{modalidadLabel[t.modalidadPago]}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Celda label="Ganado" valor={CLP(liq.base)} sub={liq.detalleBase} />
                <Celda label="+ Extras/bonos" valor={CLP(liq.extrasBonos)} color="#2f9e44" />
                <Celda label="− Adel./desc." valor={CLP(liq.descuentosAdelantos)} color="#e23b2c" />
                <Celda label="= A pagar" valor={CLP(liq.liquido)} fuerte />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>🕒 {horas.toFixed(0)} h · 📅 {dias} día(s) trabajados</span>
                {pagado > 0 && <span className="font-semibold text-emerald-600">✓ pagado en este período: {CLP(pagado)}</span>}
                {sinTarifa && <span className="font-semibold text-amber-600">⚠️ falta definir la tarifa ↓</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                {/* Configurar modalidad + tarifa */}
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-500">⚙️ Forma de pago</summary>
                  <form action={setModalidad} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Modalidad</span>
                      <select name="modalidad" defaultValue={t.modalidadPago} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                        {MODALIDADES_PAGO.map((m) => <option key={m} value={m}>{modalidadLabel[m]}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Tarifa</span>
                      <input name="tarifa" inputMode="numeric" defaultValue={t.tarifa != null ? Number(t.tarifa) : ""} placeholder="$" className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                    </label>
                    <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
                    <span className="text-[10px] text-slate-400">{tarifaLabel[t.modalidadPago]}</span>
                  </form>
                </details>

                {/* Registrar trato (producción) — producto + cantidad, todo editable */}
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-500">🍫 Registrar trato</summary>
                  <RegistrarTratoForm trabajadorId={t.id} tarifas={tarifas} />
                </details>

                {/* Registrar pago (monto editable, sugerido = líquido) */}
                <form action={registrarPagoLiquido} className="ml-auto flex items-end gap-1.5">
                  <input type="hidden" name="trabajadorId" value={t.id} />
                  <input type="hidden" name="periodo" value={label} />
                  <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Pagar $</span>
                    <input name="monto" inputMode="numeric" defaultValue={liq.liquido || ""} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  </label>
                  <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white active:scale-95">💵 Registrar pago</button>
                </form>
                <Link href={`/admin/equipo/${t.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Ficha →</Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catálogo de tarifas de trato (editable) */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-800">🍫 Tarifas de trato</h2>
          {tarifas.length === 0 && (
            <form action={cargarTarifasEjemplo}><button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cargar ejemplos</button></form>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">El valor por unidad de cada producto (editable — los precios cambian).</p>

        {/* Lista editable */}
        <ul className="mt-3 space-y-2">
          {tarifas.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              <form action={actualizarTarifaTrato} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={t.id} />
                <input name="nombre" defaultValue={t.nombre} className="min-w-[8rem] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <div className="flex items-center gap-1"><span className="text-xs text-slate-400">$</span>
                  <input name="valorUnit" defaultValue={t.valorUnit} inputMode="numeric" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  <span className="text-xs text-slate-400">c/u</span>
                </div>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
              </form>
              <form action={eliminarTarifaTrato}><input type="hidden" name="id" value={t.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
            </li>
          ))}
        </ul>

        {/* Agregar tarifa */}
        <form action={crearTarifaTrato} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <input name="nombre" placeholder="Producto nuevo" className="min-w-[9rem] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" required />
          <div className="flex items-center gap-1"><span className="text-xs text-slate-400">$</span>
            <input name="valorUnit" inputMode="numeric" placeholder="c/u" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" required />
          </div>
          <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">+ Agregar</button>
        </form>
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-xl font-extrabold text-slate-900 tabular-nums">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Celda({ label, valor, color, fuerte, sub }: { label: string; valor: string; color?: string; fuerte?: boolean; sub?: string }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${fuerte ? "bg-slate-900 text-white" : "bg-slate-50"}`}>
      <p className={`text-[10px] font-bold uppercase ${fuerte ? "text-slate-300" : "text-slate-400"}`}>{label}</p>
      <p className="text-sm font-extrabold" style={!fuerte && color ? { color } : undefined}>{valor}</p>
      {sub && <p className={`text-[9px] ${fuerte ? "text-slate-400" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}
