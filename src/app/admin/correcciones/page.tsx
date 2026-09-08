import { prisma } from "@/lib/prisma";
import { deshacerVenta, deshacerOP, deshacerGasto, deshacerPagoEquipo } from "./actions";
import DeshacerBtn from "./DeshacerBtn";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fdia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function CorreccionesPage() {
  const [ventas, ops, gastos, pagos] = await Promise.all([
    prisma.venta.findMany({ orderBy: { fecha: "desc" }, take: 15, include: { negocio: { select: { nombreNegocio: true } } } }),
    prisma.ordenProduccion.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true } } } }),
    prisma.gasto.findMany({ orderBy: { fecha: "desc" }, take: 15 }),
    prisma.movimientoTrabajador.findMany({ orderBy: { fecha: "desc" }, take: 15, include: { trabajador: { select: { nombre: true } } } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🧹 Correcciones</h1>
        <p className="text-sm text-slate-500">¿Te equivocaste al registrar algo? Deshazlo desde aquí. Cada "deshacer" <b>revierte todo</b> (stock, pago, finanzas).</p>
      </div>

      {/* Ventas */}
      <Seccion titulo="💵 Ventas recientes" vacio={ventas.length === 0}>
        {ventas.map((v) => (
          <Fila key={v.id}
            titulo={`${CLP(num(v.total))} · ${v.negocio?.nombreNegocio ?? "Consumidor final"}`}
            sub={`${fdia(v.fecha)} · ${v.canal ?? ""} · ${v.estadoPago}`}>
            <DeshacerBtn action={deshacerVenta} id={v.id} que="la venta" />
          </Fila>
        ))}
      </Seccion>

      {/* Producción */}
      <Seccion titulo="🏭 Producción reciente" vacio={ops.length === 0}>
        {ops.map((o) => (
          <Fila key={o.id}
            titulo={`${o.producto?.nombre ?? o.sabor?.nombre ?? "—"} · ${o.cantidadReal ?? o.cantidadPlan} u.`}
            sub={`${fdia(o.createdAt)} · ${o.estado}${o.estado === "terminada" ? " (ingresó a stock)" : ""}`}>
            <DeshacerBtn action={deshacerOP} id={o.id} que="la producción" />
          </Fila>
        ))}
      </Seccion>

      {/* Gastos */}
      <Seccion titulo="🧾 Gastos recientes" vacio={gastos.length === 0}>
        {gastos.map((g) => (
          <Fila key={g.id}
            titulo={`${CLP(num(g.monto))} · ${g.concepto}`}
            sub={`${fdia(g.fecha)}${g.categoria ? ` · ${g.categoria}` : ""}`}>
            <DeshacerBtn action={deshacerGasto} id={g.id} que="el gasto" />
          </Fila>
        ))}
      </Seccion>

      {/* Pagos al equipo */}
      <Seccion titulo="👥 Pagos al equipo recientes" vacio={pagos.length === 0}>
        {pagos.map((p) => (
          <Fila key={p.id}
            titulo={`${CLP(num(p.monto))} · ${p.trabajador?.nombre ?? "—"}`}
            sub={`${fdia(p.fecha)} · ${p.tipo}`}>
            <DeshacerBtn action={deshacerPagoEquipo} id={p.id} que="el pago" />
          </Fila>
        ))}
      </Seccion>

      <p className="mt-6 text-center text-[11px] text-slate-400">Solo muestra los últimos 15 de cada tipo. Deshacer es inmediato y no se puede revertir.</p>
    </div>
  );
}

function Seccion({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {vacio ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">Sin registros.</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

function Fila({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{titulo}</p>
        <p className="truncate text-[11px] text-slate-400">{sub}</p>
      </div>
      {children}
    </li>
  );
}
