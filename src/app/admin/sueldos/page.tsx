import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cargoIcono, cargoLabel } from "@/lib/dominio/equipo";
import { liquidar, rangoMes, mesActualStr, sumarMes } from "@/lib/dominio/sueldos";
import { setSueldoBase, registrarPagoLiquido } from "./actions";
import CopiarBtn from "@/components/CopiarBtn";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export default async function SueldosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActualStr();
  const { inicio, fin, label } = rangoMes(mes);

  const trabajadores = await prisma.trabajador.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      asistencias: { where: { fecha: { gte: inicio, lt: fin } }, select: { horas: true, horasExtra: true } },
      movimientos: { where: { fecha: { gte: inicio, lt: fin } }, select: { tipo: true, monto: true } },
    },
  });

  const filas = trabajadores.map((t) => {
    const horasNormales = t.asistencias.reduce((s, a) => s + a.horas, 0);
    const horasExtra = t.asistencias.reduce((s, a) => s + a.horasExtra, 0);
    const movimientos = t.movimientos.map((m) => ({ tipo: m.tipo, monto: Number(m.monto) }));
    const liq = liquidar({
      sueldoBase: t.sueldoBase ? Number(t.sueldoBase) : null,
      valorHora: t.valorHora ? Number(t.valorHora) : null,
      horasNormales, horasExtra, movimientos,
    });
    const pagado = movimientos.filter((m) => m.tipo === "pago").reduce((s, m) => s + m.monto, 0);
    const tieneHoraExtraMov = movimientos.some((m) => m.tipo === "hora_extra");
    return { t, liq, pagado, tieneHoraExtraMov };
  });

  const costoTotal = filas.reduce((s, f) => s + f.liq.liquido, 0);
  const totalHoras = filas.reduce((s, f) => s + f.liq.horasNormales + f.liq.horasExtra, 0);

  // Export para el contador
  const exportTexto =
    `LIQUIDACIONES ${label.toUpperCase()} (estimación bruta, sin imposiciones)\n` +
    filas.map((f) =>
      `${f.t.nombre} (${cargoLabel[f.t.cargo] ?? f.t.cargo}): base ${CLP(f.liq.base)} + extras/bonos ${CLP(f.liq.extrasBonos)} − adel/desc ${CLP(f.liq.descuentosAdelantos)} = LÍQUIDO ${CLP(f.liq.liquido)}`,
    ).join("\n") +
    `\n----------------------------------------\nCOSTO TOTAL EQUIPO: ${CLP(costoTotal)}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">👥 Sueldos y liquidación</h1>
          <p className="text-sm text-slate-500">Estimación mensual del líquido a pagar y costo del equipo.</p>
        </div>
        <CopiarBtn texto={exportTexto} label="📋 Copiar para el contador" />
      </div>

      {/* Navegación de mes */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link href={`/admin/sueldos?mes=${sumarMes(mes, -1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[10rem] text-center text-sm font-extrabold capitalize text-slate-800">{label}</span>
        <Link href={`/admin/sueldos?mes=${sumarMes(mes, 1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">→</Link>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="Costo del equipo" valor={CLP(costoTotal)} color="#e23b2c" />
        <Kpi label="Trabajadores" valor={String(filas.length)} color="#1479c4" />
        <Kpi label="Horas del mes" valor={totalHoras.toFixed(0)} color="#f28a1e" />
      </div>

      {/* Aviso legal */}
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ <b>Estimación bruta.</b> No incluye AFP, salud, seguro de cesantía ni mutual. Úsalo como referencia y para pagar; la liquidación legal y las imposiciones (Previred/F30) las confirma tu contador.
      </p>

      {/* Filas */}
      <div className="mt-4 space-y-3">
        {filas.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No hay trabajadores activos. Agrégalos en <Link href="/admin/equipo" className="font-semibold text-slate-600 underline">Equipo</Link>.</p>}
        {filas.map(({ t, liq, pagado, tieneHoraExtraMov }) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-900">{cargoIcono[t.cargo] ?? "👤"} {t.nombre} <span className="text-xs font-semibold text-slate-400">{cargoLabel[t.cargo] ?? t.cargo}</span></p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${liq.baseDeHoras ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{liq.baseDeHoras ? "base por horas" : "sueldo fijo"}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Celda label="Base" valor={CLP(liq.base)} />
              <Celda label="+ Extras/bonos" valor={CLP(liq.extrasBonos)} color="#2f9e44" />
              <Celda label="− Adel./desc." valor={CLP(liq.descuentosAdelantos)} color="#e23b2c" />
              <Celda label="= Líquido" valor={CLP(liq.liquido)} fuerte />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span>🕒 {liq.horasNormales.toFixed(0)} h normales · {liq.horasExtra.toFixed(0)} h extra</span>
              {liq.horasExtra > 0 && !tieneHoraExtraMov && liq.extraSugerido > 0 && (
                <span className="text-amber-600">💡 horas extra ≈ {CLP(liq.extraSugerido)} (regístralas en Equipo para sumarlas)</span>
              )}
              {pagado > 0 && <span className="font-semibold text-emerald-600">✓ pagado este mes: {CLP(pagado)}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <details className="text-xs">
                <summary className="cursor-pointer font-bold text-slate-500">💼 Definir sueldo base</summary>
                <form action={setSueldoBase} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="sueldoBase" inputMode="numeric" defaultValue={t.sueldoBase ? Number(t.sueldoBase) : ""} placeholder="mensual (vacío = por horas)" className="w-48 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
                </form>
              </details>
              <form action={registrarPagoLiquido} className="ml-auto">
                <input type="hidden" name="trabajadorId" value={t.id} />
                <input type="hidden" name="monto" value={liq.liquido} />
                <input type="hidden" name="mes" value={label} />
                <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white active:scale-95" disabled={liq.liquido <= 0}>💵 Registrar pago {CLP(liq.liquido)}</button>
              </form>
              <Link href={`/admin/equipo/${t.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Ver ficha →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-xl font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Celda({ label, valor, color, fuerte }: { label: string; valor: string; color?: string; fuerte?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ${fuerte ? "bg-slate-900 text-white" : "bg-slate-50"}`}>
      <p className={`text-[10px] font-bold uppercase ${fuerte ? "text-slate-300" : "text-slate-400"}`}>{label}</p>
      <p className="text-sm font-extrabold" style={!fuerte && color ? { color } : undefined}>{valor}</p>
    </div>
  );
}
