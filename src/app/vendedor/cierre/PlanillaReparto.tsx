"use client";

import { fmtCLP } from "@/lib/dominio/pedidos";

type Fila = { nombre: string; vendio: number; unidades: number; distUnit: number; distCost: number };

/**
 * Planilla del valor de reparto para la central: detalle por producto (vendido,
 * unidades, precio de distribución y costo) + totales. Se descarga como CSV para
 * abrir en una hoja de cálculo.
 */
export default function PlanillaReparto({
  filas, vendido, costoDistrib, valorReparto,
}: {
  filas: Fila[]; vendido: number; costoDistrib: number; valorReparto: number;
}) {
  const descargar = () => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const hoy = new Date().toLocaleDateString("es-CL");
    const lineas: string[] = [];
    lineas.push(["Producto", "Vendió", "Unidades", "Precio distribución", "Costo distribución"].map(esc).join(";"));
    for (const f of filas) {
      lineas.push([f.nombre, f.vendio, f.unidades, f.distUnit, Math.round(f.distCost)].map((v) => esc(String(v))).join(";"));
    }
    lineas.push("");
    lineas.push([esc("Vendido total"), "", "", "", esc(String(Math.round(vendido)))].join(";"));
    lineas.push([esc("Costo distribución"), "", "", "", esc(String(Math.round(costoDistrib)))].join(";"));
    lineas.push([esc("Valor de reparto"), "", "", "", esc(String(Math.round(valorReparto)))].join(";"));
    const csv = "﻿" + lineas.join("\n"); // BOM para acentos en Excel
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reparto-${hoy.replace(/\//g, "-")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mt-3">
      {filas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-1 text-left font-bold">Producto</th>
                <th className="py-1 text-right font-bold">Unid.</th>
                <th className="py-1 text-right font-bold">P. distrib.</th>
                <th className="py-1 text-right font-bold">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <td className="py-1.5 pr-2 font-semibold text-slate-800">{f.nombre}</td>
                  <td className="py-1.5 text-right text-slate-700">{f.unidades}</td>
                  <td className="py-1.5 text-right text-slate-500">{fmtCLP(f.distUnit)}</td>
                  <td className="py-1.5 text-right font-semibold text-slate-700">{fmtCLP(f.distCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button type="button" onClick={descargar} className="mt-3 w-full rounded-xl border-2 border-[#b45309] bg-white py-2.5 text-sm font-extrabold text-[#b45309] active:brightness-95">
        📊 Descargar planilla (CSV) para la central
      </button>
    </div>
  );
}
