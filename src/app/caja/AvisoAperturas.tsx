import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sesionAbierta } from "./actions";

// Recuerda abrir la Caja Local y la Caja Vecina al empezar el día.
export default async function AvisoAperturas() {
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const [sesionLocal, aperturaCV] = await Promise.all([
    sesionAbierta(),
    prisma.movimientoCajaVecina.findFirst({ where: { tipo: "apertura", fecha: { gte: hoy0 } } }),
  ]);

  const faltaLocal = !sesionLocal;
  const faltaCV = !aperturaCV;
  if (!faltaLocal && !faltaCV) return null;

  return (
    <div className="space-y-2 px-4 pt-3">
      {faltaLocal && (
        <Link href="/caja" className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm shadow-sm active:brightness-95">
          <span className="font-bold text-amber-800">⚠️ Falta abrir la <b>Caja Local</b> (con el efectivo de cambio)</span>
          <span className="shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-xs font-extrabold text-white">Abrir</span>
        </Link>
      )}
      {faltaCV && (
        <Link href="/caja/vecina" className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm shadow-sm active:brightness-95">
          <span className="font-bold text-sky-800">🏧 Si hoy usarás <b>Caja Vecina</b>, ábrela (efectivo + saldo de la máquina)</span>
          <span className="shrink-0 rounded-lg bg-sky-500 px-3 py-1 text-xs font-extrabold text-white">Abrir</span>
        </Link>
      )}
    </div>
  );
}
