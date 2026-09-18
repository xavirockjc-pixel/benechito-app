import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LINEAS_PRODUCCION, lineaLabel } from "@/lib/dominio/produccion";
import { rendimientosPorLinea } from "@/lib/dominio/fabricacion";
import { crearFabricacion } from "../actions";
import FabricarForm from "./FabricarForm";
import MicDictado from "@/components/MicDictado";

export const dynamic = "force-dynamic";

export default async function FabricarPage() {
  const [saboresAll, rends] = await Promise.all([
    prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true, linea: true }, orderBy: { nombre: "asc" } }),
    rendimientosPorLinea([...LINEAS_PRODUCCION]),
  ]);
  const saboresPorLinea: Record<string, string[]> = {};
  for (const s of saboresAll) (saboresPorLinea[s.linea] ??= []).push(s.nombre);

  const lineas = LINEAS_PRODUCCION.map((l) => ({
    id: l,
    label: lineaLabel[l] ?? l,
    porKilo: rends[l]?.porKilo ?? 0,
    muestras: rends[l]?.muestras ?? 0,
  }));

  return (
    <div>
      <Link href="/produccion" className="text-sm font-semibold text-[#0f766e]">← Producción</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧪 Nueva fabricación</h1>
      <p className="text-xs text-slate-500">Elige la línea, pon los litros y reparte los sabores por depósito. El sistema estima las unidades.</p>

      {/* Voz: toca un campo y dicta para llenarlo (nivel página para evitar el bug de Turbopack con cliente-en-cliente). */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2">
        <span className="text-xs font-semibold text-[#0f766e]">🎤 Toca un campo y dicta para llenarlo por voz</span>
        <MicDictado etiqueta="🎤" />
      </div>

      <div className="mt-3">
        <FabricarForm action={crearFabricacion} lineas={lineas} saboresPorLinea={saboresPorLinea} />
      </div>
    </div>
  );
}
