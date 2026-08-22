import { prisma } from "@/lib/prisma";
import MovimientoBodegaVoz from "./MovimientoBodegaVoz";

export const dynamic = "force-dynamic";

export default async function BodegaHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });

  if (!bodega) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Producción y Bodega</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay una bodega configurada. Créala en el panel (Inventario → Ubicaciones).
        </p>
      </div>
    );
  }

  const [productos, sabores, stockProd, stockSab] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.stock.findMany({ where: { ubicacionId: bodega.id }, include: { producto: { select: { nombre: true } } } }),
    prisma.stockSabor.findMany({ where: { ubicacionId: bodega.id }, include: { sabor: { select: { nombre: true } } } }),
  ]);

  // Catálogo combinado para la voz: productos + sabores, con id namespaced.
  const catalogo = [
    ...productos.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre })),
    ...sabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre })),
  ];

  const enBodega = stockProd.filter((s) => s.cantidad !== 0).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
  const saboresBodega = stockSab.filter((s) => s.cantidad !== 0).sort((a, b) => a.sabor.nombre.localeCompare(b.sabor.nombre));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción y Bodega</h1>
        <p className="text-xs text-slate-500">Registra lo que se produce y entra, y las mermas o salidas.</p>
      </div>

      {ok && (
        <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">
          ✓ Stock actualizado
        </p>
      )}

      {/* Entró / se produjo */}
      <section className="rounded-2xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-green-800">📥 Entró / se produjo</h2>
        <MovimientoBodegaVoz
          catalogo={catalogo}
          signo={1}
          etiqueta="Agregar por voz"
          hint="Di por ejemplo: “cincuenta trufas”, “treinta frutilla”, “cien vasos”."
          colorBoton="bg-green-600"
          textoConfirmar="Ingresar a bodega"
        />
      </section>

      {/* Salió / merma */}
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-red-800">📤 Salió / merma</h2>
        <MovimientoBodegaVoz
          catalogo={catalogo}
          signo={-1}
          etiqueta="Quitar por voz"
          hint="Di por ejemplo: “cinco trufas”, “dos frutilla” (lo que se dañó o salió)."
          colorBoton="bg-red-600"
          textoConfirmar="Descontar de bodega"
        />
      </section>

      {/* Stock actual */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">📦 Stock en bodega</h2>
        {enBodega.length === 0 && saboresBodega.length === 0 ? (
          <p className="text-sm text-slate-500">Bodega vacía. Registra lo que entra arriba.</p>
        ) : (
          <>
            {enBodega.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {enBodega.map((s) => (
                  <li key={s.id} className="flex justify-between py-1.5">
                    <span className="text-slate-800">{s.producto.nombre}</span>
                    <span className="font-bold text-slate-900">{s.cantidad}</span>
                  </li>
                ))}
              </ul>
            )}
            {saboresBodega.length > 0 && (
              <>
                <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Sabores</p>
                <ul className="grid grid-cols-2 gap-x-4 text-sm">
                  {saboresBodega.map((s) => (
                    <li key={s.id} className="flex justify-between py-1">
                      <span className="text-slate-800">{s.sabor.nombre}</span>
                      <span className="font-bold text-slate-900">{s.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
