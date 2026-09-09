"use client";

import { useEffect, useState } from "react";

/**
 * Aviso de cierre por horario. Recibe los minutos que faltan (calculados en el
 * servidor con hora de Chile) y la hora de cierre. Cuenta regresiva; muestra un
 * banner cuando falta poco y, al llegar la hora, recarga para que la app se bloquee.
 */
export default function AvisoCierreHorario({ minutos, hasta, avisarDesde = 30 }: { minutos: number; hasta: string; avisarDesde?: number }) {
  const [restan, setRestan] = useState(minutos);

  useEffect(() => {
    setRestan(minutos);
    const t = setInterval(() => {
      setRestan((m) => {
        if (m <= 1) { clearInterval(t); window.location.reload(); return 0; }
        return m - 1;
      });
    }, 60000);
    return () => clearInterval(t);
  }, [minutos]);

  if (restan > avisarDesde) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-extrabold text-white shadow">
      ⏰ Faltan {restan} min para el cierre ({hasta}). Termina y cierra caja — la app se cerrará sola.
    </div>
  );
}
