"use client";

import { useState } from "react";
import {
  CATEGORIAS_FORM, categoriaFormLabel, ROLES_FORM, rolFormLabel,
  FRECUENCIAS, frecuenciaLabel, TIPOS_CAMPO, tipoCampoLabel, type CampoForm,
} from "@/lib/dominio/checklists";
import MicDictado from "@/components/MicDictado";

type Inicial = { id?: string; nombre: string; categoria: string; rol: string; frecuencia: string; campos: CampoForm[] };

let uid = 0;
function nuevoCampo(): CampoForm {
  uid++;
  return { id: `c_${Date.now().toString(36)}_${uid}`, label: "", tipo: "si_no", requerido: false };
}

const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";

export default function FormularioEditor({
  accion,
  inicial,
}: {
  accion: (fd: FormData) => void | Promise<void>;
  inicial?: Inicial;
}) {
  const [campos, setCampos] = useState<CampoForm[]>(inicial?.campos?.length ? inicial.campos : [nuevoCampo()]);
  const set = (i: number, patch: Partial<CampoForm>) => setCampos((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const del = (i: number) => setCampos((cs) => cs.filter((_, idx) => idx !== i));
  const add = () => setCampos((cs) => [...cs, nuevoCampo()]);

  const camposJson = JSON.stringify(
    campos
      .filter((c) => c.label.trim())
      .map((c) => ({
        id: c.id,
        label: c.label.trim(),
        tipo: c.tipo,
        requerido: !!c.requerido,
        ...(c.tipo === "opcion" ? { opciones: (c.opciones ?? []).filter(Boolean) } : {}),
      })),
  );

  return (
    <form action={accion} className="max-w-2xl space-y-4">
      <div className="flex justify-end"><MicDictado etiqueta="🎤 Dictar" /></div>
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="campos" value={camposJson} />

      <label className="block text-sm font-bold text-slate-700">Nombre del checklist
        <input name="nombre" defaultValue={inicial?.nombre ?? ""} required placeholder="Ej: Higiene antes de producción" className={inputCls} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm font-bold text-slate-700">Categoría
          <select name="categoria" defaultValue={inicial?.categoria ?? "higiene"} className={inputCls}>
            {CATEGORIAS_FORM.map((c) => <option key={c} value={c}>{categoriaFormLabel[c]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">Aplica a
          <select name="rol" defaultValue={inicial?.rol ?? "todos"} className={inputCls}>
            {ROLES_FORM.map((r) => <option key={r} value={r}>{rolFormLabel[r]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">Frecuencia
          <select name="frecuencia" defaultValue={inicial?.frecuencia ?? "diaria"} className={inputCls}>
            {FRECUENCIAS.map((f) => <option key={f} value={f}>{frecuenciaLabel[f]}</option>)}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">Campos del checklist</p>
          <button type="button" onClick={add} className="rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white">＋ Agregar campo</button>
        </div>
        <div className="space-y-2">
          {campos.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex gap-2">
                <input value={c.label} onChange={(e) => set(i, { label: e.target.value })} placeholder={`Campo ${i + 1} (ej: Lavado de manos)`} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800" />
                <select value={c.tipo} onChange={(e) => set(i, { tipo: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800">
                  {TIPOS_CAMPO.map((t) => <option key={t} value={t}>{tipoCampoLabel[t]}</option>)}
                </select>
                <button type="button" onClick={() => del(i)} className="rounded-lg px-2 text-lg text-red-500" aria-label="Quitar">🗑️</button>
              </div>
              {c.tipo === "opcion" && (
                <input
                  value={(c.opciones ?? []).join(", ")}
                  onChange={(e) => set(i, { opciones: e.target.value.split(",").map((s) => s.trim()) })}
                  placeholder="Opciones separadas por coma (ej: Bueno, Regular, Malo)"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
                />
              )}
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <input type="checkbox" checked={!!c.requerido} onChange={(e) => set(i, { requerido: e.target.checked })} className="h-4 w-4 accent-[#1479c4]" />
                Obligatorio
              </label>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full rounded-xl bg-green-600 py-3 text-base font-extrabold text-white shadow active:brightness-95">
        Guardar checklist
      </button>
    </form>
  );
}
