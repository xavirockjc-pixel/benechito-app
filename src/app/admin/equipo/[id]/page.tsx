import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import {
  cargoLabel, cargoIcono, tipoMovTrabajadorLabel, tipoMovTrabajadorIcono, signoMovTrabajador, rolesDeCargo,
} from "@/lib/dominio/equipo";
import { registrarAsistencia, movimientoTrabajador, eliminarMovTrabajador, toggleTrabajador, enlazarTrabajadorUsuario } from "../actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

function rangos() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const semana = new Date(hoy); const dia = (semana.getDay() + 6) % 7; semana.setDate(semana.getDate() - dia);
  const mes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { hoy, semana, mes };
}

export default async function FichaTrabajador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.trabajador.findUnique({
    where: { id },
    include: {
      asistencias: { orderBy: { fecha: "desc" }, take: 30 },
      movimientos: { orderBy: { fecha: "desc" } },
    },
  });
  if (!t) notFound();

  const { hoy, semana, mes } = rangos();

  // Usuarios de login para enlazar (recomendados = los del rol que calza con el cargo).
  const usuarios = await prisma.usuario.findMany({ select: { id: true, nombre: true, email: true, rol: true }, orderBy: { nombre: "asc" } });
  const rolesOk = new Set(rolesDeCargo(t.cargo));
  const recomendados = usuarios.filter((us) => rolesOk.has(us.rol));
  const otros = usuarios.filter((us) => !rolesOk.has(us.rol));
  const linkActual = usuarios.find((us) => us.id === t.usuarioId) ?? null;

  // Estadísticas de producción/ventas por período.
  let statLabel = "Actividad";
  let prod = { hoy: 0, semana: 0, mes: 0 };
  if (t.cargo === "vendedor") {
    statLabel = "Ventas ($)";
    if (t.usuarioId) {
      const [h, s, m] = await Promise.all([
        prisma.venta.aggregate({ _sum: { total: true }, where: { vendedorId: t.usuarioId, fecha: { gte: hoy } } }),
        prisma.venta.aggregate({ _sum: { total: true }, where: { vendedorId: t.usuarioId, fecha: { gte: semana } } }),
        prisma.venta.aggregate({ _sum: { total: true }, where: { vendedorId: t.usuarioId, fecha: { gte: mes } } }),
      ]);
      prod = { hoy: Number(h._sum.total ?? 0), semana: Number(s._sum.total ?? 0), mes: Number(m._sum.total ?? 0) };
    }
  } else {
    // Operario / repartidor: unidades producidas (por nombre en movimientos de producción).
    statLabel = "Producción (u.)";
    const wh = { zona: "produccion", nombreUsuario: { contains: t.nombre, mode: "insensitive" as const } };
    const [h, s, m] = await Promise.all([
      prisma.movimientoBodega.aggregate({ _sum: { cantidad: true }, where: { ...wh, fecha: { gte: hoy } } }),
      prisma.movimientoBodega.aggregate({ _sum: { cantidad: true }, where: { ...wh, fecha: { gte: semana } } }),
      prisma.movimientoBodega.aggregate({ _sum: { cantidad: true }, where: { ...wh, fecha: { gte: mes } } }),
    ]);
    prod = { hoy: Number(h._sum.cantidad ?? 0), semana: Number(s._sum.cantidad ?? 0), mes: Number(m._sum.cantidad ?? 0) };
  }
  const esDinero = t.cargo === "vendedor";
  const fmtStat = (n: number) => (esDinero ? fmtCLP(n) : String(n));

  // Cuenta: saldo (a favor del trabajador) y pagado en la semana.
  const saldo = t.movimientos.reduce((s, m) => s + signoMovTrabajador(m.tipo) * Number(m.monto), 0);
  const pagadoSemana = t.movimientos.filter((m) => (m.tipo === "pago" || m.tipo === "adelanto") && m.fecha >= semana).reduce((s, m) => s + Number(m.monto), 0);
  const horasSemana = t.asistencias.filter((a) => a.fecha >= semana).reduce((s, a) => s + a.horas + a.horasExtra, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/equipo" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Equipo</Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">{cargoIcono[t.cargo]} {t.nombre}</h1>
        <form action={toggleTrabajador}><input type="hidden" name="id" value={t.id} /><button className="text-xs font-semibold text-slate-400">{t.activo ? "Desactivar" : "Activar"}</button></form>
      </div>
      <p className="text-sm text-slate-500">{cargoLabel[t.cargo] ?? t.cargo}</p>

      {/* Enlace con el login (para cruzar ventas/actividad) */}
      <form action={enlazarTrabajadorUsuario} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <input type="hidden" name="trabajadorId" value={t.id} />
        <label className="text-xs font-bold text-slate-600">🔑 Login enlazado
          <select name="usuarioId" defaultValue={t.usuarioId ?? ""} className="mt-1 block w-64 rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">— sin enlazar —</option>
            {recomendados.length > 0 && (
              <optgroup label={`Recomendados (${cargoLabel[t.cargo] ?? t.cargo})`}>
                {recomendados.map((us) => <option key={us.id} value={us.id}>{us.nombre} · {us.rol}</option>)}
              </optgroup>
            )}
            {otros.length > 0 && (
              <optgroup label="Otros usuarios">
                {otros.map((us) => <option key={us.id} value={us.id}>{us.nombre} · {us.rol}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white active:scale-95">Guardar</button>
        {linkActual && <span className="text-xs text-slate-400">Enlazado a {linkActual.email}</span>}
      </form>

      {/* Estadísticas por período */}
      <div className="mt-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{statLabel}</p>
        <div className="grid grid-cols-3 gap-2">
          <Kpi label="Hoy" valor={fmtStat(prod.hoy)} />
          <Kpi label="Semana" valor={fmtStat(prod.semana)} />
          <Kpi label="Mes" valor={fmtStat(prod.mes)} />
        </div>
        {t.cargo === "vendedor" && !t.usuarioId && <p className="mt-1 text-[11px] text-amber-600">Enlaza arriba el login del vendedor para ver sus ventas.</p>}
      </div>

      {/* Cuenta */}
      <div className="mt-5 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900">💼 Cuenta</h2>
          <div className="flex gap-4 text-right text-sm">
            <div><p className="font-extrabold text-green-700">{fmtCLP(pagadoSemana)}</p><p className="text-[10px] uppercase text-slate-400">pagado semana</p></div>
            <div><p className={`font-extrabold ${saldo >= 0 ? "text-slate-900" : "text-red-600"}`}>{fmtCLP(saldo)}</p><p className="text-[10px] uppercase text-slate-400">saldo a favor</p></div>
          </div>
        </div>

        {/* Botones rápidos: pago, adelanto, queda debiendo, horas extra */}
        <form action={movimientoTrabajador} className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
          <input type="hidden" name="trabajadorId" value={t.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Tipo
              <select name="tipo" defaultValue="pago" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="pago">💵 Pago</option>
                <option value="adelanto">🤝 Adelanto</option>
                <option value="deuda">📌 Queda debiendo</option>
                <option value="hora_extra">⏱️ Horas extra</option>
                <option value="bono">🎁 Bono</option>
                <option value="descuento">➖ Descuento</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Monto $
              <input name="monto" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Horas (si es hora extra)
              <input name="horas" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Nota
              <input name="notas" placeholder="opcional" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <button className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-extrabold text-white active:scale-95">Registrar movimiento</button>
        </form>

        {t.movimientos.length > 0 && (
          <ul className="mt-3 space-y-1">
            {t.movimientos.slice(0, 25).map((m) => {
              const signo = signoMovTrabajador(m.tipo);
              return (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm">
                  <span className="min-w-0 truncate">
                    {tipoMovTrabajadorIcono[m.tipo]} <b>{tipoMovTrabajadorLabel[m.tipo] ?? m.tipo}</b>
                    {m.horas > 0 ? <span className="text-slate-500"> · {m.horas} h</span> : ""}
                    {m.notas ? <span className="text-xs text-slate-400"> · {m.notas}</span> : ""}
                    <span className="block text-[11px] text-slate-400">{fmtFecha(m.fecha)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <b className={signo > 0 ? "text-green-600" : "text-slate-700"}>{signo > 0 ? "+" : "−"}{fmtCLP(Number(m.monto))}</b>
                    <form action={eliminarMovTrabajador}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="trabajadorId" value={t.id} /><button className="text-xs text-red-400">✕</button></form>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Asistencia */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">🗓️ Asistencia</h2>
          <span className="text-sm font-bold text-slate-500">{horasSemana.toFixed(1).replace(/\.0$/, "")} h esta semana</span>
        </div>
        <form action={registrarAsistencia} className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
          <input type="hidden" name="trabajadorId" value={t.id} />
          <label className="text-xs font-bold text-slate-600">Fecha
            <input type="date" name="fecha" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Horas
            <input name="horas" inputMode="decimal" placeholder="8" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Horas extra
            <input name="horasExtra" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Nota
            <input name="notas" placeholder="opcional" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="col-span-2 rounded-lg bg-[#0f766e] py-2.5 text-sm font-extrabold text-white active:scale-95 sm:col-span-4">Marcar asistencia</button>
        </form>
        {t.asistencias.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {t.asistencias.slice(0, 14).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">{fmtDia(a.fecha)}{a.notas ? <span className="text-xs text-slate-400"> · {a.notas}</span> : ""}</span>
                <span className="font-semibold text-slate-800">{a.horas} h{a.horasExtra > 0 ? <span className="text-amber-600"> +{a.horasExtra} extra</span> : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-lg font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
