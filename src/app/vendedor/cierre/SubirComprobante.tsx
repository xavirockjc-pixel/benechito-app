"use client";

import { useState, useRef } from "react";
import { subirComprobantePago } from "../actions";

/**
 * Sube el comprobante de una transferencia (foto o archivo). Lo convierte a data
 * URL en el navegador y lo guarda en el pago. Si ya tiene, muestra "ver".
 */
export default function SubirComprobante({ pagoId, yaTiene }: { pagoId: string; yaTiene?: boolean }) {
  const [data, setData] = useState("");
  const [nombre, setNombre] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNombre(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      setData(String(reader.result ?? ""));
      // Enviar automáticamente al elegir.
      setTimeout(() => formRef.current?.requestSubmit(), 50);
    };
    reader.readAsDataURL(f);
  }

  return (
    <form ref={formRef} action={subirComprobantePago} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="pagoId" value={pagoId} />
      <input type="hidden" name="comprobante" value={data} />
      <label className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold ${yaTiene ? "bg-green-100 text-green-700" : "bg-sky-100 text-sky-700"}`}>
        {yaTiene ? "✓ comprobante" : "📎 subir comprobante"}
        <input type="file" accept="image/*,application/pdf" capture="environment" onChange={elegir} className="hidden" />
      </label>
      {nombre && !yaTiene && <span className="max-w-[90px] truncate text-[10px] text-slate-400">{nombre}</span>}
    </form>
  );
}
