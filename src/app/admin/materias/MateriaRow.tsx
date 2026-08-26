"use client";

import { useState } from "react";
import { fmtCant, unidadLabel, stockBajo } from "@/lib/dominio/materias";
import { moverMateria, editarMateria, desactivarMateria } from "./actions";

type Mat = {
  id: string; nombre: string; categoria: string; unidad: string;
  stock: number; stockMinimo: number; costo: number | null;
};

export default function MateriaRow({ m }: { m: Mat }) {
  const [abierto, setAbierto] = useState(false);
  const bajo = stockBajo(m.stock, m.stockMinimo);
  const valor = m.costo != null ? m.stock * m.costo : null;

  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${bajo ? "border-red-300" : "border-slate-200"}`}>
      <button type="button" onClick={() => setAbierto((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="block truncate font-bold text-slate-900">{m.nombre}</span>
          <span className="block text-xs text-slate-400">
            {m.costo != null ? `$${m.costo.toLocaleString("es-CL")}/${unidadLabel[m.unidad] ?? m.unidad}` : "sin costo"}
            {valor != null ? ` · valor $${Math.round(valor).toLocaleString("es-CL")}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`text-right text-sm font-extrabold ${bajo ? "text-red-600" : "text-slate-900"}`}>
            {fmtCant(m.stock, m.unidad)}
          </span>
          {bajo && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">bajo</span>}
        </span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <EntradaMini id={m.id} unidad={unidadLabel[m.unidad] ?? m.unidad} />
          <div className="grid grid-cols-2 gap-2">
            <MermaMini id={m.id} unidad={unidadLabel[m.unidad] ?? m.unidad} />
            <Mini action={moverMateria} id={m.id} tipo="ajuste" etiqueta="✎ Ajustar a" color="bg-slate-700" ph="valor real" />
          </div>

          <form action={editarMateria} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
            <input type="hidden" name="id" value={m.id} />
            <label className="text-xs font-semibold text-slate-500">
              Costo / u.
              <input name="costo" inputMode="decimal" defaultValue={m.costo ?? ""} className="mt-0.5 w-24 rounded border border-slate-300 px-2 py-1 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Mínimo (alerta)
              <input name="stockMinimo" inputMode="decimal" defaultValue={m.stockMinimo || ""} className="mt-0.5 w-24 rounded border border-slate-300 px-2 py-1 text-sm" />
            </label>
            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Guardar</button>
          </form>

          <form action={desactivarMateria} className="text-right">
            <input type="hidden" name="id" value={m.id} />
            <button className="text-xs font-semibold text-red-500">Desactivar insumo</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Mini({
  action, id, tipo, etiqueta, color, ph,
}: {
  action: (fd: FormData) => void; id: string; tipo: string; etiqueta: string; color: string; ph: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value={tipo} />
      <input name="cantidad" inputMode="decimal" placeholder={ph} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
      <button className={`rounded-lg ${color} py-1.5 text-xs font-bold text-white`}>{etiqueta}</button>
    </form>
  );
}

/** Entrada con lote del proveedor y vencimiento (trazabilidad en alimentos). */
function EntradaMini({ id, unidad }: { id: string; unidad: string }) {
  return (
    <form action={moverMateria} className="rounded-lg border border-green-200 bg-green-50/60 p-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value="entrada" />
      <div className="flex items-center gap-2">
        <input name="cantidad" inputMode="decimal" placeholder={`+ ${unidad}`} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" />
        <input name="lote" placeholder="Lote proveedor (opcional)" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <label className="text-[11px] font-semibold text-slate-500">Vence
          <input name="vence" type="date" className="ml-1 rounded border border-slate-300 px-1 py-1 text-xs" />
        </label>
        <button className="ml-auto rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">➕ Entrada</button>
      </div>
    </form>
  );
}

/** Merma con motivo (vencido, dañado…) para poder ajustar los costos reales. */
function MermaMini({ id, unidad }: { id: string; unidad: string }) {
  return (
    <form action={moverMateria} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tipo" value="merma" />
      <input name="cantidad" inputMode="decimal" placeholder={`- ${unidad}`} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
      <select name="motivo" defaultValue="Vencido" className="w-full rounded border border-slate-300 px-1 py-1 text-xs text-slate-600">
        <option>Vencido</option><option>Dañado</option><option>Derrame</option><option>Robo/pérdida</option><option>Otro</option>
      </select>
      <button className="rounded-lg bg-amber-600 py-1.5 text-xs font-bold text-white">➖ Merma</button>
    </form>
  );
}
