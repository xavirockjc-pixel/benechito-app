"use client";

import { useState } from "react";
import { ventaMano } from "../actions";

const MEDIOS = [
  { v: "efectivo", l: "💵 Efectivo" },
  { v: "transferencia", l: "📲 Transferencia" },
  { v: "tarjeta", l: "💳 Débito / Tarjeta" },
];

const fmt = (n: number) => "$" + n.toLocaleString("es-CL");

/** Venta a mano: solo monto + nota + pago, sin elegir producto. */
export default function VentaMano() {
  const [monto, setMonto] = useState("");
  const [estado, setEstado] = useState<"pagado" | "abono" | "fiado">("pagado");
  const [abono, setAbono] = useState("");
  const [conCliente, setConCliente] = useState(false);

  const montoN = Number(monto.replace(/[^0-9]/g, "")) || 0;
  const abonoN = Math.min(Number(abono.replace(/[^0-9]/g, "")) || 0, montoN);
  const debe = estado === "fiado" ? montoN : estado === "abono" ? Math.max(0, montoN - abonoN) : 0;

  const inp = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]";

  return (
    <form action={ventaMano} className="space-y-4">
      {/* Monto */}
      <label className="block">
        <span className="text-sm font-extrabold text-slate-700">Monto de la venta *</span>
        <input name="monto" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" required placeholder="Ej: 15000" className={`mt-1 text-lg font-bold ${inp}`} />
      </label>

      {/* Nota del pedido */}
      <label className="block">
        <span className="text-sm font-extrabold text-slate-700">Nota del pedido (opcional)</span>
        <input name="nota" placeholder="Ej: 2 cajas surtidas · entrega mañana" className={`mt-1 ${inp}`} />
      </label>

      {/* Cómo pagó */}
      <div>
        <span className="text-sm font-extrabold text-slate-700">¿Cómo pagó?</span>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {([["pagado", "✅ Pagó todo"], ["abono", "➗ Abonó"], ["fiado", "📝 Fiado"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setEstado(v)}
              className={`rounded-xl border-2 py-2.5 text-xs font-extrabold ${estado === v ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>{l}</button>
          ))}
        </div>
        <input type="hidden" name="estado" value={estado} />
      </div>

      {/* Abono (si corresponde) */}
      {estado === "abono" && (
        <label className="block">
          <span className="text-sm font-extrabold text-slate-700">¿Cuánto pagó ahora?</span>
          <input name="abono" value={abono} onChange={(e) => setAbono(e.target.value)} inputMode="numeric" placeholder="Ej: 5000" className={`mt-1 ${inp}`} />
        </label>
      )}

      {/* Medio (si pagó algo) */}
      {estado !== "fiado" && (
        <div>
          <span className="text-sm font-extrabold text-slate-700">Medio de pago</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {MEDIOS.map((m) => (
              <label key={m.v} className="cursor-pointer">
                <input type="radio" name="medio" value={m.v} defaultChecked={m.v === "efectivo"} className="peer sr-only" />
                <span className="block rounded-xl border-2 border-slate-200 bg-white py-2.5 text-center text-xs font-bold text-slate-500 peer-checked:border-[#1479c4] peer-checked:bg-blue-50 peer-checked:text-[#1479c4]">{m.l}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Cliente particular (opcional) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
          <input type="checkbox" checked={conCliente} onChange={(e) => setConCliente(e.target.checked)} className="h-5 w-5 accent-[#1479c4]" />
          👤 Guardar como cliente particular
        </label>
        {conCliente && (
          <div className="mt-2 space-y-2">
            <input name="clienteNombre" placeholder="Nombre del cliente" className={inp} />
            <input name="clienteTelefono" inputMode="tel" placeholder="WhatsApp (opcional)" className={inp} />
            <p className="text-[11px] text-slate-400">Queda guardado para buscarlo después por nombre o teléfono.</p>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border-2 border-[#1479c4]/30 bg-blue-50/40 p-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</p>
        <p className="text-3xl font-extrabold text-[#1479c4]">{fmt(montoN)}</p>
        {debe > 0 && <p className="mt-1 text-sm font-extrabold text-red-600">Queda debiendo {fmt(debe)}</p>}
      </div>

      <button disabled={montoN <= 0} className="w-full rounded-2xl bg-[#1479c4] py-4 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        💾 Registrar venta
      </button>
    </form>
  );
}
