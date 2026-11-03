"use client";

import { useState, useTransition } from "react";
import { prepararEnvio } from "./actions";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const waNum = (w: string) => { const d = (w || "").replace(/\D/g, ""); return d.startsWith("56") ? d : d.length === 9 ? "56" + d : d; };

type Props = {
  ventaId: string;
  nombre: string;
  total: number;
  folio: string | null;
  whatsapp: string | null;
  email: string | null;
  enviadaEn: string | null; // texto "3 nov, 14:20" o null
  canal: string | null;
};

/**
 * Botones para enviar la factura al cliente (WhatsApp/correo). Al tocar, el
 * sistema DEJA REGISTRO de que se envió (fecha + canal) y abre el mensaje con el
 * enlace a la factura. Así, aunque el teléfono no muestre los enviados, en el
 * panel queda claro "✅ Enviada".
 */
export default function EnviarFactura({ ventaId, nombre, total, folio, whatsapp, email, enviadaEn, canal }: Props) {
  const [pending, startTransition] = useTransition();
  const [enviada, setEnviada] = useState<string | null>(enviadaEn);
  const [canalEnv, setCanalEnv] = useState<string | null>(canal);

  const mensaje = (url: string) =>
    `Hola ${nombre} 👋, aquí está tu factura${folio ? ` N° ${folio}` : ""} por ${CLP(total)} de Benechito 🐝:\n${url}\n¡Gracias por tu compra!`;

  function enviar(via: "whatsapp" | "email") {
    startTransition(async () => {
      const r = await prepararEnvio(ventaId, via);
      if (!r) return;
      const url = `${window.location.origin}/f/${r.token}`;
      const texto = mensaje(url);
      if (via === "whatsapp") {
        const dest = whatsapp ? waNum(whatsapp) : "";
        window.open(`https://wa.me/${dest}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      } else if (email) {
        window.open(`mailto:${email}?subject=${encodeURIComponent("Tu factura Benechito")}&body=${encodeURIComponent(texto)}`, "_blank");
      }
      setEnviada("recién");
      setCanalEnv(via);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {enviada ? (
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
          ✅ Enviada {canalEnv === "whatsapp" ? "📲" : canalEnv === "email" ? "✉️" : ""} {enviada === "recién" ? "ahora" : enviada}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">⏳ Sin enviar</span>
      )}
      {whatsapp && (
        <button type="button" disabled={pending} onClick={() => enviar("whatsapp")}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">
          {enviada ? "Reenviar" : "Enviar"} 📲 WhatsApp
        </button>
      )}
      {email && (
        <button type="button" disabled={pending} onClick={() => enviar("email")}
          className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">
          ✉️ Correo
        </button>
      )}
    </div>
  );
}
