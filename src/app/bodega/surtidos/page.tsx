import { prisma } from "@/lib/prisma";
import ArmarMixto from "../ArmarMixto";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", paleta: "Paletas", postre: "Postres",
};

export default async function SurtidosPage() {
  const [productos, sabores] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🍬 Armar surtidos</h1>
        <p className="text-xs text-slate-500">Saca bolsas de sabores de cámara, mézclalas y anota cuántos surtidos salieron.</p>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
        <ArmarMixto
          productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
          sabores={sabores.map((s) => ({ id: s.id, nombre: `${s.nombre} · ${lineaLabel[s.linea] ?? s.linea}` }))}
        />
      </section>
    </div>
  );
}
