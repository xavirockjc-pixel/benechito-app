import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { signoCV } from "@/lib/dominio/caja-vecina";
import CierreCajaVecinaForm from "./CierreCajaVecinaForm";

export const dynamic = "force-dynamic";

const num = (v: unknown) => Number(v ?? 0);

export default async function CierreCajaVecinaPage() {
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const movs = await prisma.movimientoCajaVecina.findMany({ where: { fecha: { gte: hoy0 } }, orderBy: { fecha: "desc" } });

  const apertura = movs.find((m) => m.tipo === "apertura");
  const efectivoEsperado = movs.reduce((s, m) => s + signoCV(m.tipo) * num(m.monto), 0);
  const saldoApertura = apertura ? num(apertura.saldoMaquina) : 0;
  const hoyTxt = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="mx-auto max-w-md">
      <Link href="/caja/vecina" className="text-sm font-semibold text-[#0f7a44]">← Volver a Caja Vecina</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🔒 Cerrar Caja Vecina</h1>
      <p className="mb-4 text-sm text-slate-500">Cuadra el efectivo y compara el saldo de la máquina con el de la apertura.</p>

      {!apertura ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Hoy no se abrió la Caja Vecina. <Link href="/caja/vecina" className="font-semibold text-[#0f7a44]">Abrirla primero</Link>
        </p>
      ) : (
        <CierreCajaVecinaForm efectivoEsperado={efectivoEsperado} saldoApertura={saldoApertura} hoyTxt={hoyTxt} />
      )}
    </div>
  );
}
