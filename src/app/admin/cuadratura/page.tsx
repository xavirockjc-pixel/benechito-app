import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { signoCV } from "@/lib/dominio/caja-vecina";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const hora = (d: Date | null) => (d ? new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "—");

export default async function CuadraturaPage({ searchParams }: { searchParams: Promise<{ off?: string }> }) {
  const sp = await searchParams;
  const off = Number.isFinite(Number(sp.off)) ? parseInt(sp.off ?? "0", 10) : 0;

  const base = new Date(); base.setHours(0, 0, 0, 0);
  const inicio = new Date(base); inicio.setDate(inicio.getDate() - off);
  const fin = new Date(inicio); fin.setDate(fin.getDate() + 1);
  const diaTxt = inicio.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });

  const [sesiones, movsCV] = await Promise.all([
    prisma.sesionCaja.findMany({
      where: { fechaApertura: { gte: inicio, lt: fin } },
      include: { ventas: { include: { pagos: true } }, movimientos: true, usuario: { select: { nombre: true } } },
      orderBy: { fechaApertura: "asc" },
    }),
    prisma.movimientoCajaVecina.findMany({ where: { fecha: { gte: inicio, lt: fin } }, orderBy: { fecha: "asc" } }),
  ]);

  // ---- Caja Local (una o varias sesiones) ----
  const local = sesiones.map((s) => {
    const porMedio: Record<string, number> = {};
    for (const v of s.ventas) for (const p of v.pagos) porMedio[p.medio] = (porMedio[p.medio] ?? 0) + num(p.monto);
    const efectivoVentas = porMedio["efectivo"] ?? 0;
    const fondo = num(s.fondoInicial);
    const ingresos = s.movimientos.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + num(m.monto), 0);
    const egresos = s.movimientos.filter((m) => m.tipo === "egreso").reduce((a, m) => a + num(m.monto), 0);
    const esperado = fondo + efectivoVentas + ingresos - egresos;
    const contado = s.efectivoContado != null ? num(s.efectivoContado) : null;
    const dif = contado != null ? contado - esperado : null;
    const totalVentas = s.ventas.reduce((a, v) => a + num(v.total), 0);
    return { id: s.id, usuario: s.usuario?.nombre ?? "—", estado: s.estado, fondo, efectivoVentas, ingresos, egresos, esperado, contado, dif, totalVentas, nVentas: s.ventas.length, apertura: s.fechaApertura, cierre: s.fechaCierre };
  });

  // ---- Caja Vecina ----
  const apCV = movsCV.find((m) => m.tipo === "apertura");
  const cierreCV = movsCV.find((m) => m.tipo === "cierre");
  const cvEfectivoInicial = apCV ? num(apCV.monto) : 0;
  const cvMaquinaInicial = apCV ? num(apCV.saldoMaquina) : 0;
  const cvEfectivoEsperado = movsCV.reduce((s, m) => s + signoCV(m.tipo) * num(m.monto), 0);
  const cvContadoMatch = cierreCV?.detalle?.match(/Efectivo contado:\s*(\d+)/);
  const cvEfectivoContado = cvContadoMatch ? Number(cvContadoMatch[1]) : null;
  const cvMaquinaFinal = cierreCV ? num(cierreCV.saldoMaquina) : null;
  const cvDifEfectivo = cvEfectivoContado != null ? cvEfectivoContado - cvEfectivoEsperado : null;
  const cvDifMaquina = cvMaquinaFinal != null ? cvMaquinaFinal - cvMaquinaInicial : null;
  const cvGiros = movsCV.filter((m) => m.tipo === "giro").reduce((s, m) => s + num(m.monto), 0);
  const cvDepositos = movsCV.filter((m) => m.tipo === "deposito" || m.tipo === "pago").reduce((s, m) => s + num(m.monto), 0);
  const cvComision = movsCV.filter((m) => m.tipo === "comision").reduce((s, m) => s + num(m.monto), 0);
  const usoCV = apCV || movsCV.length > 0;

  const qs = (o: number) => `/admin/cuadratura?off=${o}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">⚖️ Cuadratura diaria</h1>
        <p className="text-sm text-slate-500">Cierre de <b>Caja Local</b> y <b>Caja Vecina</b> del día, en un solo lugar.</p>
      </div>

      {/* Navegación de día */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link href={qs(off + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[13rem] text-center text-sm font-extrabold capitalize text-slate-800">{off === 0 ? "Hoy · " : ""}{diaTxt}</span>
        <Link href={qs(Math.max(0, off - 1))} className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold ${off === 0 ? "cursor-default text-slate-300" : "text-slate-600 hover:bg-slate-50"}`}>→</Link>
      </div>

      {/* ===== Caja Local ===== */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🛒 Caja Local</h2>
      {local.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">No se abrió caja local este día.</p>
      ) : (
        <div className="space-y-3">
          {local.map((s) => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">{s.usuario} · {hora(s.apertura)}–{hora(s.cierre)}</span>
                <EstadoBadge estado={s.estado} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                <Dato label="Ventas" valor={`${CLP(s.totalVentas)} (${s.nVentas})`} />
                <Dato label="Fondo inicial" valor={CLP(s.fondo)} />
                <Dato label="Ventas efectivo" valor={CLP(s.efectivoVentas)} />
                {s.ingresos > 0 && <Dato label="Ingresos caja" valor={CLP(s.ingresos)} />}
                {s.egresos > 0 && <Dato label="Egresos caja" valor={`- ${CLP(s.egresos)}`} />}
                <Dato label="Efectivo esperado" valor={CLP(s.esperado)} />
                <Dato label="Efectivo contado" valor={s.contado != null ? CLP(s.contado) : "—"} />
              </div>
              {s.dif != null && <Diferencia dif={s.dif} />}
            </div>
          ))}
        </div>
      )}

      {/* ===== Caja Vecina ===== */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🏧 Caja Vecina</h2>
      {!usoCV ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">Sin movimientos de Caja Vecina este día.</p>
      ) : (
        <div className="space-y-3">
          {/* Efectivo */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">💵 Efectivo</span>
              {cierreCV ? <EstadoBadge estado="cerrada" /> : apCV ? <EstadoBadge estado="abierta" /> : null}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <Dato label="Efectivo inicial" valor={CLP(cvEfectivoInicial)} />
              <Dato label="Depósitos/pagos" valor={CLP(cvDepositos)} />
              <Dato label="Giros" valor={`- ${CLP(cvGiros)}`} />
              <Dato label="Comisión" valor={CLP(cvComision)} />
              <Dato label="Efectivo esperado" valor={CLP(cvEfectivoEsperado)} />
              <Dato label="Efectivo contado" valor={cvEfectivoContado != null ? CLP(cvEfectivoContado) : "—"} />
            </div>
            {cvDifEfectivo != null && <Diferencia dif={cvDifEfectivo} />}
          </div>
          {/* Máquina */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-sm font-bold text-slate-800">🏧 Máquina</span>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <Dato label="Saldo apertura" valor={CLP(cvMaquinaInicial)} />
              <Dato label="Saldo final" valor={cvMaquinaFinal != null ? CLP(cvMaquinaFinal) : "—"} />
              <Dato label="Movimiento" valor={cvDifMaquina != null ? `${cvDifMaquina >= 0 ? "+" : "−"}${CLP(Math.abs(cvDifMaquina))}` : "—"} />
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400">
        📊 Se arma solo con las aperturas y cierres del día. Ver también <Link href="/admin/caja" className="font-semibold text-slate-600 underline">Cierres de caja</Link> y <Link href="/admin/caja-vecina" className="font-semibold text-slate-600 underline">Caja Vecina</Link>.
      </p>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800 tabular-nums">{valor}</span>
    </div>
  );
}

function Diferencia({ dif }: { dif: number }) {
  return (
    <div className={`mt-2 rounded-lg px-3 py-2 text-center text-sm font-bold ${dif === 0 ? "bg-green-100 text-green-700" : dif > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
      {dif === 0 ? "Cuadra exacto ✓" : dif > 0 ? `Sobran ${CLP(dif)}` : `Faltan ${CLP(-dif)}`}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cerrada = estado === "cerrada";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${cerrada ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
      {cerrada ? "🔒 Cerrada" : "🔓 Abierta"}
    </span>
  );
}
