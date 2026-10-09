import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { costeoLineas, LINEAS_COSTEABLES } from "@/lib/dominio/costeo";
import { lineaLabel } from "@/lib/dominio/produccion";
import CostoLineaEditor from "./CostoLineaEditor";

export const dynamic = "force-dynamic";

const fmtCLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const RANGOS: Record<string, { label: string; dias: number }> = {
  hoy: { label: "Hoy", dias: 1 },
  "7": { label: "7 días", dias: 7 },
  "30": { label: "30 días", dias: 30 },
};

export default async function RentabilidadProductos({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const rango = RANGOS[r ?? "7"] ? (r ?? "7") : "7";
  const dias = RANGOS[rango].dias;

  const hasta = new Date();
  const desde = new Date();
  if (dias === 1) desde.setHours(0, 0, 0, 0);
  else desde.setDate(desde.getDate() - dias);

  const [lineas, registros] = await Promise.all([
    costeoLineas(desde, hasta),
    prisma.controlCalidad.findMany({
      where: { clase: "linea", refId: { in: [...LINEAS_COSTEABLES] }, fecha: { gte: desde, lt: hasta } },
      orderBy: { fecha: "desc" }, take: 60,
      select: { id: true, refId: true, nombre: true, cantidad: true, operarios: true, turno: true, fecha: true },
    }),
  ]);

  const totProd = lineas.reduce((s, l) => s + l.producidas, 0);
  const totPagoEst = lineas.reduce((s, l) => s + l.pagoEstimado, 0);
  const totGanVend = lineas.reduce((s, l) => s + l.gananciaVendidas, 0);
  const totIngVend = lineas.reduce((s, l) => s + l.ingresoVendidas, 0);
  const margenGlobal = totIngVend > 0 ? (totGanVend / totIngVend) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🏭 Producción y rentabilidad</h1>
      <p className="text-sm text-slate-500">
        Lo que se produjo (queda registrado), el pago estimado, y según lo vendido tu ganancia y margen.
        Tú y yo, paletas y postres. (Los dulces vienen después.)
      </p>

      {/* Rango */}
      <div className="mt-4 flex gap-2">
        {Object.entries(RANGOS).map(([k, v]) => (
          <Link key={k} href={`/admin/rentabilidad-productos?r=${k}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${rango === k ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-300 bg-white text-slate-600"}`}>
            {v.label}
          </Link>
        ))}
      </div>

      {/* Dashboard resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resumen label="Producido" valor={`${totProd} u.`} color="#1479c4" />
        <Resumen label="Pago estimado" valor={fmtCLP(totPagoEst)} color="#f28a1e" />
        <Resumen label="Ganancia (vendido)" valor={fmtCLP(totGanVend)} color={totGanVend >= 0 ? "#2f9e44" : "#e23b2c"} />
        <Resumen label="Margen global" valor={`${margenGlobal.toFixed(0)}%`} color={margenGlobal >= 30 ? "#2f9e44" : "#f28a1e"} />
      </div>

      {/* Editor por producto */}
      <div className="mt-5 space-y-4">
        {lineas.map((l) => (
          <CostoLineaEditor key={l.linea} {...l} />
        ))}
      </div>

      {/* Registro de producción del período */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">🧾 Producción registrada ({RANGOS[rango].label})</h2>
        {registros.length === 0 ? (
          <p className="text-sm text-slate-500">No hay producción registrada en este período.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registros.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="font-bold text-teal-700">+{m.cantidad}</span>{" "}
                  <span className="font-semibold text-slate-700">{lineaLabel[m.refId ?? ""] ?? m.refId}</span>
                  <span className="block text-[11px] text-slate-500">{m.nombre}</span>
                  {m.operarios && <span className="block text-[11px] font-semibold text-[#0f766e]">👤 {m.operarios}</span>}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(m.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })} ·{" "}
                  {new Date(m.fecha).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        💡 El margen pinta verde (≥40% por producto / ≥30% global), naranjo o rojo para que de un vistazo sepas
        cómo estás trabajando. Cuando cargues el costo real de cada producto, estos números son tu certeza para
        decidir precios y producción.
      </p>
    </div>
  );
}

function Resumen({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-extrabold leading-tight" style={{ color }}>{valor}</p>
    </div>
  );
}
