"use client";

import { useState } from "react";
import { guardarCostoLinea } from "./actions";

const fmtCLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

type Props = {
  linea: string;
  label: string;
  icono: string;
  color: string;
  producidas: number;
  vendidas: number;
  pagoUnit: number;
  precioVenta: number;
  costoReal: number;
};

/**
 * Tarjeta por producto: muestra lo producido/vendido y deja cargar pago, precio
 * y costo por unidad. Calcula en vivo la ganancia por unidad, el margen % y la
 * ganancia según lo vendido. Guarda al tocar "Guardar".
 */
export default function CostoLineaEditor(p: Props) {
  const [pago, setPago] = useState(p.pagoUnit ? String(p.pagoUnit) : "");
  const [precio, setPrecio] = useState(p.precioVenta ? String(p.precioVenta) : "");
  const [costo, setCosto] = useState(p.costoReal ? String(p.costoReal) : "");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const nPago = Number(pago.replace(/[^0-9]/g, "")) || 0;
  const nPrecio = Number(precio.replace(/[^0-9]/g, "")) || 0;
  const nCosto = Number(costo.replace(/[^0-9]/g, "")) || 0;

  const gananciaUnit = nPrecio - nCosto - nPago;
  const margen = nPrecio > 0 ? (gananciaUnit / nPrecio) * 100 : 0;
  const pagoEstimado = p.producidas * nPago;
  const gananciaVendidas = p.vendidas * gananciaUnit;
  const margenColor = margen >= 40 ? "#2f9e44" : margen >= 20 ? "#f28a1e" : "#e23b2c";

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("linea", p.linea);
    fd.set("pagoUnit", String(nPago));
    fd.set("precioVenta", String(nPrecio));
    fd.set("costoReal", String(nCosto));
    try {
      await guardarCostoLinea(fd);
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 bg-white shadow-sm" style={{ borderColor: p.color }}>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-white" style={{ background: p.color }}>
        <span className="flex items-center gap-2 text-base font-extrabold"><span className="text-xl">{p.icono}</span>{p.label}</span>
        <span className="text-xs font-semibold text-white/90">Producido: {p.producidas} u. · Vendido: {p.vendidas} u.</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          <CampoMoneda label="Pago x unidad" hint="lo que pagas" value={pago} set={setPago} />
          <CampoMoneda label="Precio venta" hint="a cuánto vendes" value={precio} set={setPrecio} />
          <CampoMoneda label="Costo real" hint="insumos + otros" value={costo} set={setCosto} />
        </div>

        {/* Resultados en vivo */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Ganas x unidad" valor={fmtCLP(gananciaUnit)} color={margenColor} />
          <Kpi label="Margen" valor={`${margen.toFixed(0)}%`} color={margenColor} />
          <Kpi label="Pago estimado" valor={fmtCLP(pagoEstimado)} sub={`${p.producidas} u. producidas`} />
          <Kpi label="Ganancia vendida" valor={fmtCLP(gananciaVendidas)} sub={`${p.vendidas} u. vendidas`} color={gananciaVendidas >= 0 ? "#2f9e44" : "#e23b2c"} />
        </div>

        <button type="button" onClick={guardar} disabled={guardando}
          className="w-full rounded-xl py-2.5 text-sm font-extrabold text-white disabled:opacity-50" style={{ background: p.color }}>
          {ok ? "✓ Guardado" : guardando ? "Guardando…" : "Guardar valores"}
        </button>
        <p className="text-[11px] text-slate-400">
          El pago es el estimado; cuando ingreses lo que realmente pagaste, lo ajustas aquí. El costo real lo subes tú por producto.
        </p>
      </div>
    </section>
  );
}

function CampoMoneda({ label, hint, value, set }: { label: string; hint: string; value: string; set: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className="mt-0.5 flex items-center rounded-lg border border-slate-300 bg-white px-2">
        <span className="text-slate-400">$</span>
        <input value={value} onChange={(e) => set(e.target.value)} inputMode="numeric" placeholder="0"
          className="w-full px-1 py-2 text-right text-base font-semibold outline-none" />
      </span>
      <span className="text-[10px] text-slate-400">{hint}</span>
    </label>
  );
}

function Kpi({ label, valor, sub, color = "#334155" }: { label: string; valor: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-extrabold leading-tight" style={{ color }}>{valor}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
