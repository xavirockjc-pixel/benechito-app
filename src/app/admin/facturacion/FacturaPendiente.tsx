"use client";

import { useState } from "react";
import { marcarFacturada } from "./actions";
import { abrirEfactura } from "@/lib/sii-app";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const waNum = (w: string) => { const d = (w || "").replace(/\D/g, ""); return d.startsWith("56") ? d : d.length === 9 ? "56" + d : d; };

type Cliente = { nombre: string; rut: string | null; razonSocial: string | null; giro: string | null; dir: string | null; email: string | null; tel?: string | null };
type Item = { nombre: string; cantidad: number; precioUnit: number };

export default function FacturaPendiente({ ventaId, total, fecha, cliente, items = [] }: { ventaId: string; total: number; fecha: string; cliente: Cliente; items?: Item[] }) {
  const [folio, setFolio] = useState("");
  const [foto, setFoto] = useState("");
  const [copiado, setCopiado] = useState(false);

  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  // Detalle por producto en NETO (sin IVA) para pegar línea a línea en e-Factura.
  const lineasNeto = items.map((i) => {
    const netoUnit = Math.round(i.precioUnit / 1.19);
    return { nombre: i.nombre, cantidad: i.cantidad, netoUnit, netoTotal: netoUnit * i.cantidad };
  });
  const detalleTxt = lineasNeto.length > 0
    ? lineasNeto.map((l) => `${l.cantidad} x ${l.nombre} — neto ${CLP(l.netoUnit)} c/u`).join("\n")
    : "";

  const datos =
    `${cliente.razonSocial || cliente.nombre}\n` +
    `RUT: ${cliente.rut ?? "—"}\n` +
    `Giro: ${cliente.giro ?? "—"}\n` +
    `Dirección: ${cliente.dir ?? "—"}\n` +
    `Fono: ${cliente.tel ?? "—"}\n` +
    `Email: ${cliente.email ?? "—"}\n` +
    (detalleTxt ? `\nDetalle (neto):\n${detalleTxt}\n` : "") +
    `\nNeto: ${CLP(neto)}  IVA: ${CLP(iva)}  Total: ${CLP(total)}`;

  const msgCliente = `Hola ${cliente.razonSocial || cliente.nombre} 👋, te hago llegar tu factura de Benechito 🐝 por ${CLP(total)}${folio ? ` (N° ${folio})` : ""}. ¡Gracias!`;
  const waCliente = cliente.tel ? `https://wa.me/${waNum(cliente.tel)}?text=${encodeURIComponent(msgCliente)}` : null;

  async function copiar() {
    try { await navigator.clipboard.writeText(datos); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch { /* noop */ }
  }

  function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const esc = Math.min(1, 1100 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        setFoto(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = r.result as string;
    };
    r.readAsDataURL(file);
  }

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900">{cliente.razonSocial || cliente.nombre}</p>
          <p className="text-xs text-slate-500">RUT {cliente.rut ?? "—"}{cliente.tel ? ` · 📞 ${cliente.tel}` : ""} · {fecha}</p>
          <p className="text-xs text-slate-500">Total <b className="text-slate-800">{CLP(total)}</b> <span className="text-slate-400">(neto {CLP(neto)} + IVA {CLP(iva)})</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copiar} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">{copiado ? "✓ Copiado" : "📋 Copiar datos"}</button>
          <button type="button" onClick={() => { copiar(); abrirEfactura(); }} className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white">📲 e-Factura</button>
          {waCliente && <a href={waCliente} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">💬 Enviar al cliente</a>}
        </div>
      </div>

      {/* Detalle de la venta en NETO (sin IVA), para pegar en e-Factura */}
      {lineasNeto.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg bg-slate-50 px-3 py-1 text-xs">
          {lineasNeto.map((l, i) => (
            <li key={i} className="flex items-center justify-between py-1">
              <span className="min-w-0 truncate text-slate-600">{l.cantidad}× {l.nombre}</span>
              <span className="ml-2 shrink-0 font-semibold text-slate-700">neto {CLP(l.netoUnit)} c/u · {CLP(l.netoTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={marcarFacturada} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="ventaId" value={ventaId} />
        <input type="hidden" name="foto" value={foto} />
        <label className="text-xs font-bold text-slate-600">Folio
          <input name="folio" value={folio} onChange={(e) => setFolio(e.target.value)} placeholder="N° factura" className="mt-1 block w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          📷 Pantallazo
          <input type="file" accept="image/*" capture="environment" onChange={subir} className="hidden" />
        </label>
        {foto && <img src={foto} alt="factura" className="h-10 w-10 rounded border border-slate-200 object-cover" />}
        <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white active:brightness-95">✓ Marcar facturada</button>
      </form>
    </div>
  );
}
