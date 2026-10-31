import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { registrarAcceso } from "@/lib/dominio/accesos";
import { editarRegistroProduccion, borrarRegistroProduccion } from "../actions";

export const dynamic = "force-dynamic";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Registro de producción por CALENDARIO (día / semana / mes). Cada día del calendario
 * muestra lo fabricado; al abrir un día se ve quién fabricó, cuántos y el detalle —
 * para calcular pagos y cuántos helados se hicieron. Reemplaza el listado plano.
 */
export default async function RegistroProduccion({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  await registrarAcceso("produccion", "Registro / calendario");
  const sp = await searchParams;

  const hoy = new Date();
  // Mes visible (YYYY-MM) y día seleccionado (YYYY-MM-DD).
  const [ay, am] = (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : ymd(hoy).slice(0, 7)).split("-").map(Number);
  const mesIni = new Date(ay, am - 1, 1, 0, 0, 0, 0);
  const mesFin = new Date(ay, am, 1, 0, 0, 0, 0);
  const diaSel = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : (ymd(hoy).startsWith(`${ay}-${String(am).padStart(2, "0")}`) ? ymd(hoy) : "");

  const movs = await prisma.movimientoBodega.findMany({
    where: { zona: "produccion", fecha: { gte: mesIni, lt: mesFin } },
    orderBy: { fecha: "asc" },
    select: { id: true, nombre: true, cantidad: true, detalle: true, fecha: true },
  });

  // Totales por día del mes.
  const porDia = new Map<string, { total: number; trabaj: Set<string> }>();
  for (const m of movs) {
    const k = ymd(new Date(m.fecha));
    const e = porDia.get(k) ?? { total: 0, trabaj: new Set<string>() };
    e.total += m.cantidad;
    if (m.detalle) e.trabaj.add(m.detalle.trim());
    porDia.set(k, e);
  }
  const totalMes = movs.reduce((s, m) => s + m.cantidad, 0);

  // Rejilla del mes (lunes a domingo).
  const primerDiaSemana = (mesIni.getDay() + 6) % 7; // 0 = lunes
  const diasEnMes = new Date(ay, am, 0).getDate();
  const celdas: (number | null)[] = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];
  while (celdas.length % 7 !== 0) celdas.push(null);

  // Navegación de mes.
  const mesPrev = new Date(ay, am - 2, 1); const mesNext = new Date(ay, am, 1);
  const qMes = (d: Date) => `?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Detalle del día seleccionado: agrupado por trabajador (para pagos).
  const delDia = diaSel ? movs.filter((m) => ymd(new Date(m.fecha)) === diaSel) : [];
  const porTrab = new Map<string, { total: number; items: { nombre: string; cantidad: number }[] }>();
  for (const m of delDia) {
    const quien = (m.detalle || "Sin nombre").trim();
    const e = porTrab.get(quien) ?? { total: 0, items: [] };
    e.total += m.cantidad;
    e.items.push({ nombre: m.nombre, cantidad: m.cantidad });
    porTrab.set(quien, e);
  }
  const totalDia = delDia.reduce((s, m) => s + m.cantidad, 0);

  // Total de la SEMANA del día seleccionado (lunes a domingo).
  let totalSemana = 0; let rangoSemana = "";
  if (diaSel) {
    const d = new Date(diaSel + "T12:00:00");
    const lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay() + 6) % 7)); lun.setHours(0, 0, 0, 0);
    const dom = new Date(lun); dom.setDate(lun.getDate() + 7);
    totalSemana = movs.filter((m) => { const f = new Date(m.fecha); return f >= lun && f < dom; }).reduce((s, m) => s + m.cantidad, 0);
    rangoSemana = `${lun.getDate()} ${MESES[lun.getMonth()].slice(0, 3)} – ${new Date(dom.getTime() - 1).getDate()} ${MESES[(new Date(dom.getTime() - 1)).getMonth()].slice(0, 3)}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/produccion" className="text-sm font-semibold text-[#b45309]">← Producción</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">📅 Registro de producción</h1>
        <p className="text-xs text-slate-500">Toca un día para ver quién fabricó y cuántos. Totales por día, semana y mes.</p>
      </div>

      {/* Navegación de mes + total del mes */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link href={qMes(mesPrev)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">‹</Link>
        <div className="text-center">
          <p className="text-sm font-extrabold text-slate-900">{MESES[am - 1]} {ay}</p>
          <p className="text-[11px] font-semibold text-[#0f766e]">{totalMes} u. en el mes</p>
        </div>
        <Link href={qMes(mesNext)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">›</Link>
      </div>

      {/* Calendario */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400">
          {DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celdas.map((n, i) => {
            if (n == null) return <div key={i} />;
            const k = `${ay}-${String(am).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
            const e = porDia.get(k);
            const esHoy = k === ymd(hoy);
            const sel = k === diaSel;
            return (
              <Link key={i} href={`?mes=${ay}-${String(am).padStart(2, "0")}&dia=${k}`}
                className={`flex min-h-[46px] flex-col items-center justify-start rounded-lg border p-1 text-center ${sel ? "border-[#b45309] bg-amber-50" : e ? "border-teal-200 bg-teal-50" : "border-slate-100 bg-white"}`}>
                <span className={`text-[11px] font-bold ${esHoy ? "text-[#b45309]" : "text-slate-600"}`}>{n}{esHoy ? "•" : ""}</span>
                {e && <span className="mt-0.5 text-[11px] font-extrabold text-teal-700">{e.total}</span>}
                {e && <span className="text-[9px] text-slate-400">{e.trabaj.size}👤</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Detalle del día seleccionado (para pagos) */}
      {diaSel && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">👤 {new Date(diaSel + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" })}</h2>
            <span className="text-xs font-bold text-teal-700">{totalDia} u.</span>
          </div>
          {totalSemana > 0 && <p className="text-[11px] text-slate-400">Semana ({rangoSemana}): <b className="text-slate-600">{totalSemana} u.</b></p>}

          {porTrab.size === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Sin producción registrada este día.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {[...porTrab.entries()].sort((a, b) => b[1].total - a[1].total).map(([quien, e]) => (
                <div key={quien} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{quien}</span>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-teal-700">{e.total} u.</span>
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    {e.items.map((it, j) => <li key={j}>{it.cantidad}× {it.nombre}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Corregir / borrar registros del día (para arreglar pruebas o errores) */}
          {delDia.length > 0 && (
            <details className="mt-3 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-extrabold text-slate-500">✏️ Corregir / borrar registros</summary>
              <div className="space-y-2 border-t border-slate-100 p-2">
                {delDia.map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <form action={editarRegistroProduccion} className="flex flex-wrap items-end gap-1.5">
                      <input type="hidden" name="id" value={m.id} />
                      <label className="text-[10px] font-bold text-slate-500">Cant.
                        <input name="cantidad" inputMode="numeric" defaultValue={m.cantidad} className="mt-0.5 block w-14 rounded border border-slate-300 px-1.5 py-1 text-center text-sm" />
                      </label>
                      <label className="min-w-0 flex-1 text-[10px] font-bold text-slate-500">Producto
                        <input name="nombre" defaultValue={m.nombre} className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-1 text-sm" />
                      </label>
                      <label className="min-w-0 flex-1 text-[10px] font-bold text-slate-500">Quién
                        <input name="detalle" defaultValue={m.detalle ?? ""} className="mt-0.5 block w-full rounded border border-slate-300 px-1.5 py-1 text-sm" />
                      </label>
                      <button className="rounded-lg bg-[#1479c4] px-2.5 py-1.5 text-xs font-bold text-white">Guardar</button>
                    </form>
                    <form action={borrarRegistroProduccion} className="mt-1 text-right">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-[11px] font-bold text-rose-500">🗑️ Borrar este registro</button>
                    </form>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">Borrar devuelve a stock lo que se había sumado. Úsalo para limpiar pruebas o errores.</p>
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
