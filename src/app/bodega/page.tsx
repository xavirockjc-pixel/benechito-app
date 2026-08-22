import { prisma } from "@/lib/prisma";
import MovimientoBodegaVoz from "./MovimientoBodegaVoz";
import ArmarMixto from "./ArmarMixto";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

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

  // Inicio del día (hora local del servidor).
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [productos, sabores, registroHoy] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoBodega.findMany({
      where: { fecha: { gte: hoy }, zona: "bodega" },
      orderBy: { fecha: "desc" },
      take: 100,
    }),
  ]);

  // Catálogo combinado para la voz y el manual: productos + sabores, id namespaced.
  const catalogo = [
    ...productos.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre })),
    ...sabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre })),
  ];

  const totalEntradas = registroHoy.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.cantidad, 0);
  const totalMermas = registroHoy.filter((m) => m.tipo === "merma").reduce((s, m) => s + m.cantidad, 0);
  const totalMixtos = registroHoy.filter((m) => m.tipo === "mixto").reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción y Bodega</h1>
        <p className="text-xs text-slate-500">Registra lo que se produce y entra, y las mermas o salidas.</p>
      </div>

      {ok && (
        <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">
          ✓ Registrado
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

      {/* Armar mixto / surtido (mezclar sabores) */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-[#b45309]">🍬 Armar mixto / surtido</h2>
        <p className="mb-2 text-xs text-slate-500">Saca bolsas de sabores de cámara, mézclalas y anota cuántos mixtos salieron.</p>
        <ArmarMixto
          productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
          sabores={sabores.map((s) => ({ id: s.id, nombre: s.nombre }))}
        />
      </section>

      {/* Registro del día (lo que se movió hoy) — NO muestra el stock total (eso es privado del panel) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Registro de hoy</h2>
          <span className="text-xs font-semibold text-slate-400">
            +{totalEntradas} / −{totalMermas}{totalMixtos > 0 ? ` · 🍬${totalMixtos}` : ""}
          </span>
        </div>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras movimientos hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registroHoy.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0">
                  <span className={`font-bold ${m.tipo === "entrada" ? "text-green-700" : m.tipo === "mixto" ? "text-[#b45309]" : "text-red-600"}`}>
                    {m.tipo === "entrada" ? "📥 +" : m.tipo === "mixto" ? "🍬 " : "📤 −"}{m.cantidad}
                  </span>{" "}
                  <span className="text-slate-800">{m.nombre}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo registrado hoy. El stock total y la producción acumulada se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
