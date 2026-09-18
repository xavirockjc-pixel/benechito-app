import Link from "next/link";
import { lineaLabel } from "@/lib/dominio/produccion";
import { resumenTurnoProduccion } from "@/lib/dominio/fabricacion";
import { inicioDelDia } from "@/lib/dominio/empresa";
import { cerrarTurnoProduccion } from "../actions";
import CierreTurno from "./CierreTurno";
import MicDictado from "@/components/MicDictado";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  const desde = await inicioDelDia();
  const { porLinea, insumos } = await resumenTurnoProduccion(desde);

  const lineas = porLinea.map((l) => ({
    linea: l.linea,
    label: lineaLabel[l.linea] ?? l.linea,
    litros: Math.round(l.litros * 100) / 100,
    sabores: l.sabores,
    estimado: l.estimado,
    rendAprendido: l.rendAprendido,
    tandas: l.tandas,
  }));

  const insumosVista = insumos.map((i) => ({
    nombre: i.nombre,
    unidad: i.unidad,
    categoria: i.categoria,
    cantidad: Math.round(i.cantidad * 100) / 100,
    porLinea: Object.fromEntries(Object.entries(i.porLinea).map(([k, v]) => [lineaLabel[k] ?? k, Math.round(v * 100) / 100])),
  }));

  return (
    <div>
      <Link href="/produccion" className="text-sm font-semibold text-[#0f766e]">← Producción</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧾 Cierre de turno</h1>
      <p className="text-xs text-slate-500">Pon las unidades reales que salieron por línea. El sistema compara con lo estimado por los litros mezclados y afina el rendimiento.</p>

      {lineas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay fabricaciones registradas en este turno. Registra una en <b>🧪 Nueva fabricación</b> y vuelve a cerrar.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2">
            <span className="text-xs font-semibold text-[#0f766e]">🎤 Toca un campo y dicta el número por voz</span>
            <MicDictado etiqueta="🎤" />
          </div>
          <div className="mt-3">
            <CierreTurno action={cerrarTurnoProduccion} lineas={lineas} insumos={insumosVista} />
          </div>
        </>
      )}
    </div>
  );
}
