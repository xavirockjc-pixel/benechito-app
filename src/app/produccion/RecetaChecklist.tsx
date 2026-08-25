"use client";

import { useMemo, useState } from "react";
import { fmtCant, unidadLabel, categoriaIcono } from "@/lib/dominio/materias";
import { lineaLabel, LINEAS_PRODUCCION } from "@/lib/dominio/produccion";
import { confirmarMezcla } from "./actions";

type BaseItem = { id: string; nombre: string; unidad: string; cantidad: number; grupo: string | null };
type Mat = { id: string; nombre: string; unidad: string; categoria: string };
type Guia = { videoUrl: string | null; pasos: string | null };
type Medida = { id: string; nombre: string; litros: number };
type Rol = "esencia" | "color" | "otro";
type Agregado = { key: number; rol: Rol; materiaPrimaId: string; nombre: string; unidad: string; cantidad: string };
type SaborLote = { key: number; nombre: string; porcion: string; medidaId: string; agregados: Agregado[] };

const ROL_INFO: Record<Rol, { label: string; icono: string; color: string; ph: string }> = {
  esencia: { label: "Esencia / saborizante", icono: "🧴", color: "#b45309", ph: "ej: 1,5" },
  color: { label: "Colorante", icono: "🎨", color: "#be185d", ph: "ej: 3" },
  otro: { label: "Otro insumo", icono: "🧂", color: "#475569", ph: "grs" },
};

/**
 * Control de calidad: tipo + base (litros/kg/medida). La receta base se descuenta
 * escalada por la base. El lote se reparte en VARIOS SABORES; cada sabor tiene su
 * porción (litros/balde) y sus agregados (esencia, color, preparado…) que se pesan
 * y se descuentan.
 */
export default function RecetaChecklist({
  basePorLinea,
  materiales,
  guiaPorLinea = {},
  baseRefPorLinea = {},
  medidas = [],
  lineasBloqueadas = [],
  onDesbloquear,
  claveIncorrecta = false,
}: {
  basePorLinea: Record<string, BaseItem[]>;
  materiales: Mat[];
  guiaPorLinea?: Record<string, Guia>;
  baseRefPorLinea?: Record<string, { baseRef: number; baseUnidad: string }>;
  medidas?: Medida[];
  lineasBloqueadas?: string[];
  onDesbloquear?: (formData: FormData) => void;
  claveIncorrecta?: boolean;
}) {
  const bloqueada = (l: string) => lineasBloqueadas.includes(l);
  const [linea, setLinea] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [baseCant, setBaseCant] = useState("");
  const [medidaId, setMedidaId] = useState("l");
  const [sabores, setSabores] = useState<SaborLote[]>([]);

  const n = Math.max(0, Number(cantidad.replace(/[^0-9]/g, "")) || 0);
  const cantBase = Math.max(0, Number(baseCant.replace(",", ".").replace(/[^0-9.]/g, "")) || 0);
  const medidaSel = medidas.find((m) => m.id === medidaId);
  const baseNum = medidaSel ? cantBase * medidaSel.litros : cantBase;
  const baseUnidad = medidaSel ? "l" : medidaId;
  const baseRef = (linea && baseRefPorLinea[linea]?.baseRef) || 1;
  const factor = baseNum / baseRef;
  const base = useMemo(() => (linea ? basePorLinea[linea] ?? [] : []), [linea, basePorLinea]);
  const fijos = base.filter((b) => !b.grupo);
  const grupos = useMemo(() => {
    const m = new Map<string, BaseItem[]>();
    for (const b of base) if (b.grupo) { if (!m.has(b.grupo)) m.set(b.grupo, []); m.get(b.grupo)!.push(b); }
    return [...m.entries()];
  }, [base]);
  const estaBloqueada = !!linea && bloqueada(linea);
  const guia = linea && !estaBloqueada ? guiaPorLinea[linea] : undefined;
  const pasos = (guia?.pasos ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const mostrarForm = !!linea && !estaBloqueada;

  // --- Sabores del lote ---
  const addSabor = () => setSabores((s) => [...s, { key: Date.now() + s.length, nombre: "", porcion: "", medidaId: "l", agregados: [] }]);
  const setSabor = (key: number, patch: Partial<SaborLote>) => setSabores((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const delSabor = (key: number) => setSabores((s) => s.filter((x) => x.key !== key));
  const addAg = (sk: number, rol: Rol) => setSabor(sk, { agregados: [...(sabores.find((s) => s.key === sk)?.agregados ?? []), { key: Date.now(), rol, materiaPrimaId: "", nombre: "", unidad: "g", cantidad: "" }] });
  const setAg = (sk: number, ak: number, patch: Partial<Agregado>) => {
    const s = sabores.find((x) => x.key === sk); if (!s) return;
    setSabor(sk, { agregados: s.agregados.map((a) => (a.key === ak ? { ...a, ...patch } : a)) });
  };
  const delAg = (sk: number, ak: number) => {
    const s = sabores.find((x) => x.key === sk); if (!s) return;
    setSabor(sk, { agregados: s.agregados.filter((a) => a.key !== ak) });
  };
  const esNuevo = (a: Agregado) => !a.materiaPrimaId || a.materiaPrimaId === "__nuevo__";
  const litrosDe = (s: SaborLote) => {
    const c = Math.max(0, Number(s.porcion.replace(",", ".").replace(/[^0-9.]/g, "")) || 0);
    const m = medidas.find((x) => x.id === s.medidaId);
    return m ? c * m.litros : c;
  };
  const saboresJSON = JSON.stringify(
    sabores.filter((s) => s.nombre.trim()).map((s) => ({
      nombre: s.nombre.trim(),
      porcion: litrosDe(s),
      agregados: s.agregados
        .filter((a) => ((a.materiaPrimaId && a.materiaPrimaId !== "__nuevo__") || a.nombre.trim()) && Number(a.cantidad.replace(",", ".")) > 0)
        .map((a) => ({ rol: a.rol, materiaPrimaId: esNuevo(a) ? undefined : a.materiaPrimaId, nombre: esNuevo(a) ? a.nombre.trim() || undefined : undefined, unidad: a.unidad, cantidad: Number(a.cantidad.replace(",", ".")) })),
    })),
  );

  return (
    <div className="space-y-3">
      {/* Qué se produce */}
      <div className="grid grid-cols-2 gap-2">
        <select value={linea} onChange={(e) => setLinea(e.target.value)} className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
          <option value="">¿Qué tipo produces?</option>
          {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l]}{bloqueada(l) ? " 🔒" : ""}</option>)}
        </select>
        {/* Base: cantidad × medida */}
        <div className="col-span-2 rounded-lg border-2 border-teal-200 bg-teal-50/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-800">Base:</span>
            <input value={baseCant} onChange={(e) => setBaseCant(e.target.value)} inputMode="decimal" placeholder="cuántos" className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" />
            <select value={medidaId} onChange={(e) => setMedidaId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
              <option value="l">litros</option>
              <option value="kg">kg</option>
              {medidas.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.litros} L)</option>)}
            </select>
          </div>
          {baseNum > 0 && (
            <p className="mt-1 text-[11px] text-teal-700">= <b>{baseNum}</b> {baseUnidad} de base{baseRef > 1 ? ` · ${factor.toFixed(2).replace(/\.?0+$/, "")}× el lote de ${baseRef}` : ""}</p>
          )}
        </div>
        <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="numeric" placeholder="Unidades totales (opcional)" className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800" />
      </div>

      {estaBloqueada && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-center text-sm font-semibold text-amber-700">🔒 Receta protegida. Ingresa la clave de este tipo.</p>
          {claveIncorrecta && <p className="mb-2 text-center text-xs font-bold text-red-600">Clave incorrecta</p>}
          {onDesbloquear && (
            <form action={onDesbloquear} className="flex items-center gap-2">
              <input type="hidden" name="linea" value={linea} />
              <input name="clave" type="password" inputMode="numeric" placeholder={`Clave de ${lineaLabel[linea] ?? linea}`} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">Desbloquear</button>
            </form>
          )}
        </div>
      )}

      {/* Guía */}
      {linea && !estaBloqueada && (guia?.videoUrl || pasos.length > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">🎬 Guía de la receta</p>
          {guia?.videoUrl && <a href={guia.videoUrl} target="_blank" rel="noopener noreferrer" className="mb-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white active:brightness-95">▶ Ver video</a>}
          {pasos.length > 0 && <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">{pasos.map((p, i) => <li key={i}>{p.replace(/^\s*\d+[.)-]\s*/, "")}</li>)}</ol>}
        </div>
      )}

      {mostrarForm && (
        <form action={confirmarMezcla} className="space-y-3 rounded-xl border-2 border-teal-200 bg-white p-3">
          <input type="hidden" name="cantidad" value={n} />
          <input type="hidden" name="base" value={baseNum} />
          <input type="hidden" name="baseUnidad" value={baseUnidad} />
          <input type="hidden" name="linea" value={linea} />
          <input type="hidden" name="total" value={fijos.length + grupos.length} />
          <input type="hidden" name="sabores" value={saboresJSON} />

          {/* Segmento 1 — Insumos base */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700">
              1) Insumos base · {lineaLabel[linea]} {baseNum > 0 ? `· ${baseNum} ${baseUnidad}` : ""} — marca lo que echaste
            </p>
            {base.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">Este tipo no tiene receta base. Cárgala en la central (Recetas → Receta base por tipo).</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {fijos.map((it) => (
                    <li key={it.id}>
                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                        <input type="checkbox" name="marcado" value={it.id} defaultChecked className="h-5 w-5 accent-[#0f766e]" />
                        <span className="flex-1 text-sm font-semibold text-slate-800">{it.nombre}</span>
                        <span className="text-sm font-bold text-teal-700">{baseNum > 0 ? fmtCant(it.cantidad * factor, it.unidad) : fmtCant(it.cantidad, it.unidad)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {grupos.map(([g, items]) => (
                  <div key={g} className="mt-2">
                    <label className="text-xs font-bold text-slate-600">{g} <span className="font-normal text-slate-400">(elige uno)</span>
                      <select name="marcado" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
                        <option value="">— elegir {g.toLowerCase()} —</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.nombre} · {baseNum > 0 ? fmtCant(it.cantidad * factor, it.unidad) : fmtCant(it.cantidad, it.unidad)}</option>)}
                      </select>
                    </label>
                  </div>
                ))}
              </>
            )}
            {baseNum === 0 && base.length > 0 && <p className="mt-1 text-[11px] text-amber-600">Pon la <b>base</b> arriba para calcular cuánto sale de cada insumo.</p>}
          </div>

          {/* Segmento 2 — Sabores del lote (cada uno con su porción + esencia/color) */}
          <div className="rounded-lg bg-amber-50/60 p-2">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">2) 🍦 Sabores del lote (esencia, color…)</p>
              <button type="button" onClick={addSabor} className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white">+ Sabor</button>
            </div>
            {sabores.length === 0 ? (
              <p className="text-[11px] text-slate-500">Reparte el lote en sabores. Ej: “1 balde vainilla”, “20 L frutilla”. A cada sabor le agregas su <b>esencia</b>, su <b>color</b> y otros insumos con sus gramos (ej: 1,5 g sabor · 3 g color).</p>
            ) : (
              <div className="space-y-2">
                {sabores.map((s) => (
                  <div key={s.key} className="rounded-lg border border-amber-200 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <input value={s.nombre} onChange={(e) => setSabor(s.key, { nombre: e.target.value })} placeholder="Sabor (ej: vainilla)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      <input value={s.porcion} onChange={(e) => setSabor(s.key, { porcion: e.target.value })} inputMode="decimal" placeholder="porción" className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                      <select value={s.medidaId} onChange={(e) => setSabor(s.key, { medidaId: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-1 py-1.5 text-xs">
                        <option value="l">L</option>
                        {medidas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                      <button type="button" onClick={() => delSabor(s.key)} className="shrink-0 text-xs font-semibold text-red-500">✕</button>
                    </div>
                    {/* Agregados de este sabor: esencia, color, otros insumos */}
                    <div className="mt-1.5 space-y-1.5 pl-1">
                      {s.agregados.map((a) => {
                        const info = ROL_INFO[a.rol];
                        return (
                          <div key={a.key} className="rounded-lg border border-slate-200 bg-slate-50/70 p-1.5">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: info.color }}>{info.icono} {info.label}</span>
                              <button type="button" onClick={() => delAg(s.key, a.key)} className="text-xs font-semibold text-red-500">✕ quitar</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <select value={a.materiaPrimaId} onChange={(e) => setAg(s.key, a.key, { materiaPrimaId: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                                <option value="">— elige {info.label.toLowerCase()} —</option>
                                {materiales.map((m) => <option key={m.id} value={m.id}>{categoriaIcono[m.categoria]} {m.nombre}</option>)}
                                <option value="__nuevo__">➕ crear nuevo</option>
                              </select>
                              <input value={a.cantidad} onChange={(e) => setAg(s.key, a.key, { cantidad: e.target.value })} inputMode="decimal" placeholder={info.ph} className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm" />
                              <select value={a.unidad} onChange={(e) => setAg(s.key, a.key, { unidad: e.target.value })} className="w-14 rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-xs">
                                <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option><option value="unidad">u.</option>
                              </select>
                            </div>
                            {a.materiaPrimaId === "__nuevo__" && (
                              <input value={a.nombre} onChange={(e) => setAg(s.key, a.key, { nombre: e.target.value })} placeholder={`Nombre del ${info.label.toLowerCase()} nuevo`} className="mt-1 w-full rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-sm" />
                            )}
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => addAg(s.key, "esencia")} className="rounded bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">🧴 + Esencia</button>
                        <button type="button" onClick={() => addAg(s.key, "color")} className="rounded bg-pink-100 px-2 py-1 text-[11px] font-bold text-pink-700">🎨 + Color</button>
                        <button type="button" onClick={() => addAg(s.key, "otro")} className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">🧂 + Otro insumo</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turno + operarios + observaciones */}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Turno
              <select name="turno" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">—</option><option value="manana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Operarios
              <input name="operarios" placeholder="Nombres" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Observaciones
            <textarea name="observaciones" rows={2} placeholder="Notas de calidad, incidencias…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>

          <button disabled={base.length > 0 && baseNum === 0} className="w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white active:brightness-95 disabled:opacity-40">
            ✓ Confirmar mezcla y descontar insumos
          </button>
        </form>
      )}
    </div>
  );
}
