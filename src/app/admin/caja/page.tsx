import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Historial de cierres de caja (arqueo) para la central: aperturas, cierres,
 * efectivo esperado vs contado y diferencias por turno.
 */
export default async function AdminCajaPage() {
  const sesiones = await prisma.sesionCaja.findMany({
    orderBy: { fechaApertura: "desc" },
    take: 60,
    include: {
      usuario: { select: { nombre: true } },
      ubicacion: { select: { nombre: true } },
      ventas: { include: { pagos: true } },
      movimientos: true,
    },
  });

  const filas = sesiones.map((s) => {
    const porMedio: Record<string, number> = {};
    for (const v of s.ventas) for (const p of v.pagos) porMedio[p.medio] = (porMedio[p.medio] ?? 0) + Number(p.monto);
    const efectivoVentas = porMedio["efectivo"] ?? 0;
    const otros = Object.entries(porMedio).filter(([m]) => m !== "efectivo").reduce((a, [, v]) => a + v, 0);
    const fondo = Number(s.fondoInicial);
    const ingresos = s.movimientos.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + Number(m.monto), 0);
    const egresos = s.movimientos.filter((m) => m.tipo === "egreso").reduce((a, m) => a + Number(m.monto), 0);
    const esperado = fondo + efectivoVentas + ingresos - egresos;
    const contado = s.efectivoContado != null ? Number(s.efectivoContado) : null;
    const dif = contado != null ? contado - esperado : null;
    const vendido = s.ventas.reduce((a, v) => a + Number(v.total), 0);
    return { s, fondo, efectivoVentas, otros, esperado, contado, dif, vendido, egresos };
  });

  const cerradas = filas.filter((f) => f.s.estado === "cerrada");
  const totalDif = cerradas.reduce((a, f) => a + (f.dif ?? 0), 0);
  const descuadres = cerradas.filter((f) => (f.dif ?? 0) !== 0).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧾 Cierres de caja</h1>
      <p className="text-sm text-slate-500">Aperturas, cierres, efectivo esperado vs. contado y diferencias por turno.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Cierres" valor={String(cerradas.length)} />
        <Kpi label="Con descuadre" valor={String(descuadres)} alerta={descuadres > 0} />
        <Kpi label="Diferencia total" valor={fmtCLP(totalDif)} alerta={totalDif !== 0} />
      </div>

      {filas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay cajas. Se abren y cierran desde la app de caja (/caja).
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {filas.map(({ s, fondo, efectivoVentas, otros, esperado, contado, dif, vendido, egresos }) => {
            const abierta = s.estado === "abierta";
            return (
              <div key={s.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${abierta ? "border-green-300" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {abierta ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Abierta</span> : <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Cerrada</span>}
                      {" "}{s.ubicacion?.nombre ?? "Caja"}
                      {s.usuario?.nombre ? <span className="font-normal text-slate-500"> · {s.usuario.nombre}</span> : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      Abrió {fmtFecha(s.fechaApertura)}{s.fechaCierre ? ` · Cerró ${fmtFecha(s.fechaCierre)}` : ""}
                    </p>
                  </div>
                  {dif != null && (
                    <span className={`shrink-0 rounded-lg px-3 py-1 text-sm font-bold ${dif === 0 ? "bg-green-100 text-green-700" : dif > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {dif === 0 ? "Cuadra ✓" : dif > 0 ? `Sobran ${fmtCLP(dif)}` : `Faltan ${fmtCLP(-dif)}`}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  <Row label="Fondo" valor={fmtCLP(fondo)} />
                  <Row label="Vendido" valor={fmtCLP(vendido)} />
                  <Row label="Efectivo ventas" valor={fmtCLP(efectivoVentas)} />
                  {otros > 0 && <Row label="Otros medios" valor={fmtCLP(otros)} />}
                  {egresos > 0 && <Row label="Egresos" valor={`- ${fmtCLP(egresos)}`} />}
                  <Row label="Esperado" valor={fmtCLP(esperado)} />
                  {contado != null && <Row label="Contado" valor={fmtCLP(contado)} />}
                </div>
                {s.notas && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">📝 {s.notas}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-lg font-extrabold ${alerta ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{valor}</span>
    </div>
  );
}
