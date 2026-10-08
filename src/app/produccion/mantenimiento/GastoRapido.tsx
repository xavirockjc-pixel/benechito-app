"use client";

import { useState } from "react";
import { registrarGastoProd } from "./actions";

const CATS: { id: string; label: string; icono: string }[] = [
  { id: "insumos", label: "Insumo / materia", icono: "🧪" },
  { id: "herramienta", label: "Herramienta", icono: "🔧" },
  { id: "mantencion", label: "Mantención", icono: "🛠️" },
  { id: "otros", label: "Otro", icono: "📦" },
];

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");

/** Caja para anotar una compra/gasto (materia o herramienta) desde el tablet. */
export default function GastoRapido() {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("insumos");
  const [proveedor, setProveedor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const montoNum = Number(monto.replace(/[^0-9]/g, "")) || 0;

  async function guardar() {
    if (!concepto.trim() || montoNum <= 0 || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("concepto", concepto.trim());
    fd.set("monto", String(montoNum));
    fd.set("categoria", categoria);
    fd.set("proveedor", proveedor.trim());
    try {
      await registrarGastoProd(fd);
      setOk(true);
      setConcepto(""); setMonto(""); setProveedor(""); setCategoria("insumos");
      setTimeout(() => setOk(false), 1600);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <p className="text-sm font-bold text-emerald-900">💸 Anotar una compra / gasto</p>
      <p className="mt-0.5 text-[11px] text-emerald-700">Compraste materia o una herramienta. Déjalo registrado.</p>

      <div className="mt-3 space-y-2">
        <input
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="¿Qué compraste? (ej: dextrosa 5 kg, espátula)"
          className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800"
        />
        <div className="flex gap-2">
          <span className="flex min-w-0 flex-1 items-center rounded-xl border border-emerald-300 bg-white px-3">
            <span className="text-slate-400">$</span>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputMode="numeric"
              placeholder="Monto"
              className="w-full px-1 py-2 text-right text-base font-semibold outline-none"
            />
          </span>
          <input
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Proveedor (opcional)"
            className="min-w-0 flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${categoria === c.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-emerald-300 bg-white text-emerald-700"}`}
            >
              {c.icono} {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={guardar}
          disabled={!concepto.trim() || montoNum <= 0 || guardando}
          className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {ok ? "✓ Guardado" : guardando ? "Guardando…" : `Guardar gasto ${montoNum > 0 ? fmtCLP(montoNum) : ""}`}
        </button>
      </div>
    </div>
  );
}
