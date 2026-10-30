"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { facturaRapida } from "../actions";

type Cliente = { id: string; nombre: string; rut: string; razonSocial: string; giro: string; comuna: string };
type Linea = { nombre: string; cantidad: string; precio: string };

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1479c4]";

export default function FacturaRapida({ clientes, prefill }: { clientes: Cliente[]; prefill: Cliente | null }) {
  const [cliente, setCliente] = useState<Cliente | null>(prefill);
  const [q, setQ] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ nombre: "", cantidad: "1", precio: "" }]);
  const [modo, setModo] = useState("pagado");

  const suger = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return clientes.filter((c) => c.nombre.toLowerCase().includes(t) || (c.comuna || "").toLowerCase().includes(t) || (c.rut || "").includes(t)).slice(0, 6);
  }, [q, clientes]);

  const setLinea = (i: number, k: keyof Linea, v: string) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addLinea = () => setLineas((ls) => [...ls, { nombre: "", cantidad: "1", precio: "" }]);
  const delLinea = (i: number) => setLineas((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  const items = lineas
    .map((l) => ({ nombre: l.nombre.trim(), cantidad: Math.max(0, Math.floor(Number(l.cantidad) || 0)), precioUnit: Math.max(0, Number(String(l.precio).replace(/[^0-9]/g, "")) || 0) }))
    .filter((l) => l.nombre && l.cantidad > 0 && l.precioUnit >= 0);
  const total = items.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);
  const faltaRut = !!cliente && !cliente.rut;

  return (
    <form action={facturaRapida} className="space-y-3">
      <input type="hidden" name="negocioId" value={cliente?.id ?? ""} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {/* Cliente */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</p>
        {cliente ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{cliente.razonSocial || cliente.nombre}</p>
              <p className="text-xs text-slate-500">RUT {cliente.rut || "— (falta)"}</p>
            </div>
            <button type="button" onClick={() => { setCliente(null); setQ(""); }} className="shrink-0 text-xs font-semibold text-slate-500">cambiar</button>
          </div>
        ) : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente por nombre o RUT…" className={`mt-1 ${inputCls}`} />
            {suger.length > 0 && (
              <div className="mt-1 space-y-1">
                {suger.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCliente(c); setQ(""); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left text-sm active:bg-slate-50">
                    <span className="truncate font-semibold text-slate-800">{c.razonSocial || c.nombre}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">{c.rut || c.comuna}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Datos tributarios si faltan */}
      {faltaRut && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
          <p className="text-xs font-bold text-sky-800">🧾 Faltan datos para la factura — cárgalos aquí:</p>
          <input name="rut" defaultValue={cliente?.rut} placeholder="RUT (12.345.678-9)" className={`mt-2 ${inputCls}`} />
          <input name="razonSocial" defaultValue={cliente?.razonSocial} placeholder="Razón social" className={`mt-2 ${inputCls}`} />
          <input name="giro" defaultValue={cliente?.giro} placeholder="Giro" className={`mt-2 ${inputCls}`} />
        </div>
      )}

      {/* Líneas a mano (monto o producto) */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Detalle (a mano)</p>
        <div className="mt-2 space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-end gap-1.5">
              <label className="flex-1 text-[11px] font-bold text-slate-500">Producto / concepto
                <input value={l.nombre} onChange={(e) => setLinea(i, "nombre", e.target.value)} placeholder="Ej: Helados / Venta" className={`mt-0.5 ${inputCls}`} />
              </label>
              <label className="w-12 text-[11px] font-bold text-slate-500">Cant.
                <input value={l.cantidad} onChange={(e) => setLinea(i, "cantidad", e.target.value)} inputMode="numeric" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-center text-sm" />
              </label>
              <label className="w-24 text-[11px] font-bold text-slate-500">Precio
                <input value={l.precio} onChange={(e) => setLinea(i, "precio", e.target.value)} inputMode="numeric" placeholder="$" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2.5 text-right text-sm" />
              </label>
              <button type="button" onClick={() => delLinea(i)} className="mb-1 shrink-0 rounded-lg bg-slate-100 px-2 py-2 text-xs font-bold text-rose-500">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLinea} className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-bold text-slate-500">➕ Agregar línea</button>
        <p className="mt-1 text-[11px] text-slate-400">Para facturar solo un monto: escribe el concepto, cantidad 1 y el total en Precio.</p>
      </div>

      {/* Pago */}
      <select name="modo" value={modo} onChange={(e) => setModo(e.target.value)} className={inputCls}>
        <option value="pagado">Pagado (efectivo)</option>
        <option value="credito">A crédito (queda debiendo)</option>
      </select>
      {modo === "pagado" && (
        <select name="medio" defaultValue="efectivo" className={inputCls}>
          <option value="efectivo">Con efectivo</option>
          <option value="transferencia">Con transferencia</option>
        </select>
      )}

      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
        <span className="font-bold">Total factura</span>
        <span className="text-xl font-extrabold">{fmtCLP(total)}</span>
      </div>

      <button disabled={!cliente || items.length === 0} className="w-full rounded-xl bg-[#0891b2] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        🧾 Generar factura
      </button>
    </form>
  );
}
