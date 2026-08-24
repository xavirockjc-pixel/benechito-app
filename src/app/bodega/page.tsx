import { prisma } from "@/lib/prisma";
import MovimientoBodegaVoz from "./MovimientoBodegaVoz";
import RetirosDepto from "@/app/_shared/RetirosDepto";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function BodegaHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  if (!bodega) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Bodega</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay una bodega configurada. Créala en el panel (Inventario → Ubicaciones).
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [productos, sabores, stockProd, stockSab, registroHoy] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.stock.findMany({ where: { ubicacionId: bodega.id }, include: { producto: { select: { nombre: true } } } }),
    prisma.stockSabor.findMany({ where: { ubicacionId: bodega.id }, include: { sabor: { select: { nombre: true } } } }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "bodega" }, orderBy: { fecha: "desc" }, take: 100 }),
  ]);

  const catalogo = [
    ...productos.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre })),
    ...sabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre })),
  ];

  const enBodega = stockProd.filter((s) => s.cantidad !== 0).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
  const saboresBodega = stockSab.filter((s) => s.cantidad !== 0).sort((a, b) => a.sabor.nombre.localeCompare(b.sabor.nombre));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">📦 Bodega</h1>
        <p className="text-xs text-slate-500">Lo que entra y sale, y lo que hay ahora en bodega.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Stock actualizado</p>}

      {/* Entró */}
      <section className="rounded-2xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-green-800">📥 Entró a bodega</h2>
        <MovimientoBodegaVoz catalogo={catalogo} signo={1} etiqueta="Agregar por voz"
          hint="Di por ejemplo: “cincuenta trufas”, “cien vasos”." colorBoton="bg-green-600" textoConfirmar="Ingresar a bodega" />
      </section>

      {/* Salió */}
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-red-800">📤 Salió / merma</h2>
        <MovimientoBodegaVoz catalogo={catalogo} signo={-1} etiqueta="Quitar por voz"
          hint="Di por ejemplo: “cinco trufas” (lo que se dañó o salió)." colorBoton="bg-red-600" textoConfirmar="Descontar de bodega" />
      </section>

      {/* Stock actual (el bodeguero SÍ ve lo que hay; NO ve ventas del mes) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">📊 Stock actual en bodega</h2>
        {enBodega.length === 0 && saboresBodega.length === 0 ? (
          <p className="text-sm text-slate-500">Bodega vacía.</p>
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

      {/* Registro del día */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">🧾 Registro de hoy</h2>
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
          Solo ves lo del día. Los totales y las ventas del mes se ven únicamente en el panel.
        </p>
      </section>

      <RetirosDepto destino="bodega" acento="#b45309" />
    </div>
  );
}
