"use client";

import { useMemo, useState } from "react";
import { fmtCant, unidadLabel, categoriaIcono } from "@/lib/dominio/materias";
import { lineaLabel, LINEAS_PRODUCCION } from "@/lib/dominio/produccion";
import { confirmarMezcla } from "./actions";

type BaseItem = { id: string; nombre: string; unidad: string; cantidad: number };
type Mat = { id: string; nombre: string; unidad: string; categoria: string };
type Agregado = { key: number; materiaPrimaId: string; cantidad: string };

/**
 * Mezcla / control de calidad: eliges tipo (línea) + sabor + cuántas unidades.
 * Muestra la RECETA BASE del tipo como checklist (se descuenta por unidad × cantidad)
 * y una lista de AGREGADOS que se pesan aparte (esencia, color, decorado, galleta…),
 * se descuentan tal cual y quedan con su rendimiento.
 */
type Guia = { videoUrl: string | null; pasos: string | null };

export default function RecetaChecklist({
  basePorLinea,
  materiales,
  guiaPorLinea = {},
  lineasBloqueadas = [],
}: {
  basePorLinea: Record<string, BaseItem[]>;
  materiales: Mat[];
  guiaPorLinea?: Record<string, Guia>;
  lineasBloqueadas?: string[];
}) {
  const bloqueada = (l: string) => lineasBloqueadas.includes(l);
  const [linea, setLinea] = useState("");
  const [sabor, setSabor] = useState("");
  const [formato, setFormato] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [agregados, setAgregados] = useState<Agregado[]>([]);

  const n = Math.max(0, Number(cantidad.replace(/[^0-9]/g, "")) || 0);
  const base = useMemo(() => (linea ? basePorLinea[linea] ?? [] : []), [linea, basePorLinea]);
  const estaBloqueada = !!linea && bloqueada(linea);
  const guia = linea && !estaBloqueada ? guiaPorLinea[linea] : undefined;
  const pasos = (guia?.pasos ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  const addAgregado = () => setAgregados((a) => [...a, { key: Date.now() + a.length, materiaPrimaId: "", cantidad: "" }]);
  const setAg = (key: number, patch: Partial<Agregado>) => setAgregados((a) => a.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const delAg = (key: number) => setAgregados((a) => a.filter((x) => x.key !== key));

  const agregadosJSON = JSON.stringify(
    agregados
      .filter((a) => a.materiaPrimaId && Number(a.cantidad.replace(",", ".")) > 0)
      .map((a) => ({ materiaPrimaId: a.materiaPrimaId, cantidad: Number(a.cantidad.replace(",", ".")) })),
  );
  const listo = !!linea && n > 0 && !estaBloqueada;

  return (
    <div className="space-y-3">
      {/* Qué se produce */}
      <div className="grid grid-cols-2 gap-2">
        <select value={linea} onChange={(e) => setLinea(e.target.value)} className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
          <option value="">¿Qué tipo produces?</option>
          {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l]}{bloqueada(l) ? " 🔒" : ""}</option>)}
        </select>
        <input value={sabor} onChange={(e) => setSabor(e.target.value)} placeholder="Sabor (ej: vainilla oreo)" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" />
        <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="numeric" placeholder="¿Cuántas unidades?" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" />
        <input value={formato} onChange={(e) => setFormato(e.target.value)} placeholder="Formato (opcional)" className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" />
      </div>

      {estaBloqueada && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">
          🔒 Receta protegida. Ingresa la clave arriba para poder verla.
        </p>
      )}

      {/* Guía: video + paso a paso */}
      {linea && !estaBloqueada && (guia?.videoUrl || pasos.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">🎬 Guía de la receta</p>
          {guia?.videoUrl && (
            <a href={guia.videoUrl} target="_blank" rel="noopener noreferrer" className="mb-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white active:brightness-95">
              ▶ Ver video
            </a>
          )}
          {pasos.length > 0 && (
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {pasos.map((p, i) => <li key={i}>{p.replace(/^\s*\d+[.)-]\s*/, "")}</li>)}
            </ol>
          )}
        </div>
      )}

      {listo && (
        <form action={confirmarMezcla} className="space-y-3 rounded-xl border-2 border-teal-200 bg-white p-3">
          <input type="hidden" name="cantidad" value={n} />
          <input type="hidden" name="linea" value={linea} />
          <input type="hidden" name="sabor" value={sabor} />
          <input type="hidden" name="formato" value={formato} />
          <input type="hidden" name="total" value={base.length} />
          <input type="hidden" name="agregados" value={agregadosJSON} />

          {/* Receta base (checklist) */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700">Receta base · {lineaLabel[linea]} · {n} u.</p>
            {base.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                Este tipo no tiene receta base. Cárgala en la central (Materias primas → Recetas → Receta base por tipo).
              </p>
            ) : (
              <ul className="space-y-1">
                {base.map((it) => (
                  <li key={it.id}>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                      <input type="checkbox" name="marcado" value={it.id} defaultChecked className="h-5 w-5 accent-[#0f766e]" />
                      <span className="flex-1 text-sm font-semibold text-slate-800">{it.nombre}</span>
                      <span className="text-sm font-bold text-teal-700">{fmtCant(it.cantidad * n, it.unidad)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Agregados (se pesan aparte) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Agregados (se pesan)</p>
              <button type="button" onClick={addAgregado} className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white">+ Agregado</button>
            </div>
            {agregados.length === 0 ? (
              <p className="text-[11px] text-slate-400">Ej: esencia, color, salsa, decorado, relleno, frutos, galleta… Agrega los que uses y su peso.</p>
            ) : (
              <div className="space-y-2">
                {agregados.map((a) => {
                  const mat = materiales.find((m) => m.id === a.materiaPrimaId);
                  return (
                    <div key={a.key} className="flex items-center gap-2">
                      <select value={a.materiaPrimaId} onChange={(e) => setAg(a.key, { materiaPrimaId: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm">
                        <option value="">— insumo —</option>
                        {materiales.map((m) => <option key={m.id} value={m.id}>{categoriaIcono[m.categoria]} {m.nombre}</option>)}
                      </select>
                      <input value={a.cantidad} onChange={(e) => setAg(a.key, { cantidad: e.target.value })} inputMode="decimal" placeholder={mat ? unidadLabel[mat.unidad] ?? mat.unidad : "peso"} className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                      <button type="button" onClick={() => delAg(a.key)} className="shrink-0 text-xs font-semibold text-red-500">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Turno + operarios + observaciones */}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Turno
              <select name="turno" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">—</option>
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Operarios
              <input name="operarios" placeholder="Nombres" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Observaciones
            <textarea name="observaciones" rows={2} placeholder="Notas de calidad, incidencias…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>

          <button className="w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white active:brightness-95">
            ✓ Confirmar mezcla y descontar insumos
          </button>
        </form>
      )}
    </div>
  );
}
