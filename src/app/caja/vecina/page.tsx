import { prisma } from "@/lib/prisma";
import { signoCV, cvLabel, cvIcono } from "@/lib/dominio/caja-vecina";
import { eliminarMovCajaVecina } from "./actions";
import MovCajaVecinaForm from "./MovCajaVecinaForm";
import AbrirCajaVecinaForm from "./AbrirCajaVecinaForm";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const hora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function CajaVecinaPage() {
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const movs = await prisma.movimientoCajaVecina.findMany({ where: { fecha: { gte: hoy0 } }, orderBy: { fecha: "desc" } });

  const apertura = movs.find((m) => m.tipo === "apertura");
  const abierta = Boolean(apertura);
  const efectivo = movs.reduce((s, m) => s + signoCV(m.tipo) * num(m.monto), 0);
  const saldoMaquina = apertura ? num(apertura.saldoMaquina) : 0;
  const giros = movs.filter((m) => m.tipo === "giro").reduce((s, m) => s + num(m.monto), 0);
  const paraDepositar = movs.filter((m) => m.tipo === "deposito" || m.tipo === "pago").reduce((s, m) => s + num(m.monto), 0);
  const comision = movs.filter((m) => m.tipo === "comision").reduce((s, m) => s + num(m.monto), 0);

  const hoyTxt = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  const resumen =
    `🏧 Caja Vecina — ${hoyTxt}\n\n` +
    `💵 Efectivo disponible: ${CLP(efectivo)}\n` +
    (abierta ? `🏧 Saldo máquina (apertura): ${CLP(saldoMaquina)}\n` : "") +
    `📤 Giros: ${CLP(giros)}\n` +
    `📥 Para depositar: ${CLP(paraDepositar)}\n` +
    `🎁 Comisión: ${CLP(comision)}\n` +
    `Movimientos: ${movs.length}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🏧 Caja Vecina</h1>
        <p className="text-sm text-slate-500">Movimientos del servicio Caja Vecina. <b>Separado de las ventas</b>, solo para registro y control del efectivo.</p>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi label="Efectivo disponible" valor={CLP(efectivo)} color="#0f7a44" />
        <Kpi label="Saldo máquina" valor={abierta ? CLP(saldoMaquina) : "—"} color="#7c3aed" />
        <Kpi label="Giros (sale)" valor={CLP(giros)} color="#e23b2c" />
        <Kpi label="Para depositar" valor={CLP(paraDepositar)} color="#1479c4" />
        <Kpi label="Comisión" valor={CLP(comision)} color="#f28a1e" />
      </div>

      {/* Apertura del día: primero se abre con efectivo + saldo de la máquina */}
      {!abierta ? (
        <div className="mt-4"><AbrirCajaVecinaForm /></div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <span className="font-extrabold text-emerald-700">🔓 Caja abierta hoy</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-600">Efectivo inicial <b className="text-slate-800">{CLP(num(apertura!.monto))}</b></span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-600">Máquina <b className="text-slate-800">{CLP(saldoMaquina)}</b></span>
          {apertura!.nombreUsuario && <span className="text-slate-400">· abrió {apertura!.nombreUsuario}</span>}
        </div>
      )}

      <div className="mt-4"><MovCajaVecinaForm /></div>

      {/* Compartir resumen */}
      <div className="mt-4"><EnviarWhatsApp texto={resumen} /></div>

      {/* Movimientos de hoy */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Movimientos de hoy ({movs.length})</h2>
        {movs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Sin movimientos hoy.</p>
        ) : (
          <ul className="space-y-2">
            {movs.map((m) => {
              const entra = signoCV(m.tipo) > 0;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  {m.foto ? <img src={m.foto} alt="comprobante" className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-50 text-lg">{cvIcono[m.tipo]}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{cvLabel[m.tipo]}</p>
                    <p className="truncate text-[11px] text-slate-400">{hora(m.fecha)}{m.detalle ? ` · ${m.detalle}` : ""}{m.nombreUsuario ? ` · ${m.nombreUsuario}` : ""}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-extrabold tabular-nums ${entra ? "text-emerald-600" : "text-rose-600"}`}>{entra ? "+" : "−"}{CLP(num(m.monto))}</span>
                  <form action={eliminarMovCajaVecina}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-base font-extrabold text-slate-900 tabular-nums" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
