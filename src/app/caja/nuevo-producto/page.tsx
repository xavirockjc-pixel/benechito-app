import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NuevoProductoCaja from "./NuevoProductoCaja";

export const dynamic = "force-dynamic";

export default async function NuevoProductoPage() {
  const prods = await prisma.producto.findMany({ select: { linea: true } });
  const lineas = [...new Set([...prods.map((p) => p.linea), "trufa", "cuchufli", "helado", "paleta", "cocada", "postre", "bebida", "snack", "otro"])];

  return (
    <div className="mx-auto max-w-md">
      <Link href="/caja" className="text-sm font-semibold text-[#0f7a44]">← Volver a la caja</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">➕ Nuevo producto</h1>
      <p className="text-sm text-slate-500">Dícta el nombre, tómale una foto, ponle precio y stock del local.</p>
      <div className="mt-4">
        <NuevoProductoCaja lineas={lineas} />
      </div>
    </div>
  );
}
