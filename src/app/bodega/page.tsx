import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dominio/empresa";
import MovimientoBodegaVoz from "./MovimientoBodegaVoz";
import CorregirStock from "./CorregirStock";
import StockActualFix from "./StockActualFix";
import SalidaDestino from "./SalidaDestino";
import NuevoProductoBodega from "./NuevoProductoBodega";
import RetirosDepto from "@/app/_shared/RetirosDepto";
import EmpezarNuevoDia from "@/app/_shared/EmpezarNuevoDia";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";
import { site } from "@/lib/config";
import Link from "next/link";
import { ubicacionProduccionId } from "@/lib/dominio/ubicaciones";
import { POSTRE_LINEAS } from "@/lib/dominio/produccion";
import { palabraPack } from "@/lib/dominio/empaque";
import { empezarNuevoDia, productosPostre } from "./actions";

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

  const hoy = await inicioDelDia();
  // Asegura que existan los 2 ítems de postres de bodega (sueltos + pack x16).
  await productosPostre();

  const [productos, sabores, postresSabores, stockProd, stockSab, registroHoy] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true, soloLocal: false }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true, linea: { notIn: POSTRE_LINEAS } }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.sabor.findMany({ where: { activo: true, linea: { in: POSTRE_LINEAS } }, orderBy: { nombre: "asc" } }),
    prisma.stock.findMany({ where: { ubicacionId: bodega.id }, include: { producto: { select: { nombre: true } } } }),
    prisma.stockSabor.findMany({ where: { ubicacionId: bodega.id }, include: { sabor: { select: { nombre: true } } } }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "bodega" }, orderBy: { fecha: "desc" }, take: 100 }),
  ]);

  const postreIds = new Set(postresSabores.map((s) => s.id));
  const catalogo = [
    ...productos.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre })),
    ...sabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre })),
    ...postresSabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre })),
  ];

  // Clientes para sugerir en "salió para…".
  const negocios = await prisma.negocio.findMany({ select: { nombreNegocio: true, nombreContacto: true }, take: 400 });
  const clientes = [...new Set(negocios.map((n) => n.nombreNegocio || n.nombreContacto).filter((x): x is string => !!x))].sort();

  const enBodega = stockProd.filter((s) => s.cantidad !== 0).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
  // Sabores con stock, SIN los de postres (esos van en su propio bloque "Postres por sabor").
  const saboresBodega = stockSab.filter((s) => s.cantidad !== 0 && !postreIds.has(s.saborId)).sort((a, b) => a.sabor.nombre.localeCompare(b.sabor.nombre));

  // --- Dos sectores del stock actual ---
  // 1) Por PACK/BOLSA: los productos que se cuentan en bolsas/packs (postres 16,
  //    paletas y tú y yo 50). Siempre se muestran, aunque estén en 0.
  const packProds = productos.filter((p) => (p.unidadesPack ?? 0) > 0);
  const packIds = new Set(packProds.map((p) => p.id));
  const itemsPack = packProds.map((p) => ({
    id: `prod:${p.id}`,
    nombre: `${p.nombre} · ${palabraPack(p.unidadesPack!)} ×${p.unidadesPack}`,
    cantidad: stockProd.find((s) => s.productoId === p.id)?.cantidad ?? 0,
    grupo: "Productos" as const,
  }));
  // 2) POR UNIDAD / POR SABOR: productos sin pack (con stock) + sabores (con stock).
  //    Lo que el bodeguero lleva por unidad y por sabor (manual o por voz).
  const itemsUnidad = [
    ...enBodega.filter((s) => !packIds.has(s.productoId)).map((s) => ({ id: `prod:${s.productoId}`, nombre: s.producto.nombre, cantidad: s.cantidad, grupo: "Productos" as const })),
    ...saboresBodega.map((s) => ({ id: `sab:${s.saborId}`, nombre: s.sabor.nombre, cantidad: s.cantidad, grupo: "Sabores" as const })),
  ];
  // Postres por sabor: SIEMPRE visibles (aunque estén en 0) para cargarlos a mano.
  const stockSabMapTodos = new Map(stockSab.map((s) => [s.saborId, s.cantidad]));
  const itemsPostreSabor = postresSabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre, cantidad: stockSabMapTodos.get(s.id) ?? 0, grupo: "Sabores" as const }));

  // Conteo/corrección: TODOS los productos y sabores con su stock actual (0 si no hay).
  const stockProdMap = new Map(stockProd.map((s) => [s.productoId, s.cantidad]));
  const stockSabMap = new Map(stockSab.map((s) => [s.saborId, s.cantidad]));
  const itemsConteo = [
    ...productos.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre, actual: stockProdMap.get(p.id) ?? 0, grupo: "Productos" as const })),
    ...sabores.map((s) => ({ id: `sab:${s.id}`, nombre: s.nombre, actual: stockSabMap.get(s.id) ?? 0, grupo: "Sabores" as const })),
  ];

  // Texto del stock para enviar por WhatsApp (al dueño): SOLO lo que cuenta en
  // bodega (los packs/bolsas de arriba). Lo de "por sabor / por unidad" es aparte.
  const fechaTxt = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  const packConStock = itemsPack.filter((i) => i.cantidad > 0);
  const lineasStock = [`📦 *Stock Bodega* · ${fechaTxt}`, ""];
  if (packConStock.length) lineasStock.push(...packConStock.map((i) => `• ${i.nombre}: ${i.cantidad}`));
  else lineasStock.push("Sin packs en bodega.");
  const textoStock = lineasStock.join("\n");

  // Pendiente por recibir de Producción (stock que fabricó Producción y aún no entra a bodega).
  const prodUb = await ubicacionProduccionId();
  const [pendSab, pendProd] = prodUb
    ? await Promise.all([
        prisma.stockSabor.aggregate({ _sum: { cantidad: true }, _count: true, where: { ubicacionId: prodUb, cantidad: { gt: 0 } } }),
        prisma.stock.aggregate({ _sum: { cantidad: true }, _count: true, where: { ubicacionId: prodUb, cantidad: { gt: 0 } } }),
      ])
    : [{ _sum: { cantidad: 0 }, _count: 0 }, { _sum: { cantidad: 0 }, _count: 0 }];
  const pendItems = Number(pendSab._count ?? 0) + Number(pendProd._count ?? 0);
  const pendU = Number(pendSab._sum.cantidad ?? 0) + Number(pendProd._sum.cantidad ?? 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">📦 Bodega</h1>
        <p className="text-xs text-slate-500">Lo que entra y sale, y lo que hay ahora en bodega.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Stock actualizado</p>}

      {/* Recibir de producción (lo que fabricó Producción y aún no entra a bodega) */}
      <Link href="/bodega/recibir"
        className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-sm active:opacity-90 ${pendItems > 0 ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
        <span className="flex items-center gap-2">
          <span className="text-2xl">📥</span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">Recibir de producción</span>
            <span className={`block text-[11px] font-semibold leading-tight ${pendItems > 0 ? "text-white/90" : "text-slate-400"}`}>
              {pendItems > 0 ? `${pendItems} por recibir · ${pendU} u.` : "Nada pendiente por ahora"}
            </span>
          </span>
        </span>
        <span className="text-lg">›</span>
      </Link>

      {/* Crear producto nuevo (foto + voz) */}
      <NuevoProductoBodega />

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

      {/* Salió para un cliente/destino → queda pendiente para confirmar como venta */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-[#b45309]">🚚 Salió para un cliente / destino</h2>
        <p className="mb-2 text-[11px] text-amber-700">Ej: “salieron 20 tú y yo para don Juan”. Luego confirmas en la central si se vendió.</p>
        <SalidaDestino catalogo={catalogo} clientes={clientes} />
      </section>

      {/* Corregir/poner el stock real directo (conteo), sin pasar por ventas/entradas */}
      <CorregirStock items={itemsConteo} />

      {/* Sector 1 — Stock de BODEGA por PACK / BOLSA (lo que cuenta) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">📦 Stock de bodega (packs / bolsas)</h2>
        <p className="mb-2 text-[11px] text-slate-400">Lo que hay <b>disponible en bodega</b>, por bolsas/packs (postres ×16, paletas y tú y yo ×50). Tócalo para corregir.</p>
        {itemsPack.length === 0 ? (
          <p className="text-sm text-slate-500">No hay productos por pack configurados.</p>
        ) : (
          <StockActualFix items={itemsPack} />
        )}

        {/* Enviar el stock (de bodega) por WhatsApp al dueño */}
        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-sm font-bold text-[#1faa55]">📲 Enviar el stock por WhatsApp</summary>
          <div className="mt-2">
            <EnviarWhatsApp texto={textoStock} telefono={site.whatsapp} />
          </div>
        </details>
      </section>

      {/* Sector 2 — Por UNIDAD / por SABOR (OCULTO, aparte: NO suma con los packs) */}
      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-slate-900">📝 Por unidad / por sabor (aparte)</summary>
        <p className="mt-1 text-[11px] text-slate-400">
          Registro <b>aparte</b> para ir cargando por unidad y por sabor (postres, tú y yo, paletas, premium…).
          Es lo que viene de fabricación y <b>aún no cuenta</b> con los packs de arriba.
        </p>

        {/* Postres por sabor: siempre visibles para cargarlos a mano */}
        {itemsPostreSabor.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#b45309]/20 bg-amber-50/40 p-3">
            <p className="mb-1 text-xs font-extrabold text-[#b45309]">🍨 Postres por sabor (unidades)</p>
            <StockActualFix items={itemsPostreSabor} />
          </div>
        )}

        <div className="mt-3">
          {itemsUnidad.length === 0 ? (
            <p className="text-sm text-slate-500">Nada más por unidad todavía.</p>
          ) : (
            <StockActualFix items={itemsUnidad} />
          )}
        </div>
      </details>

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
                  <span className={`font-bold ${m.tipo === "entrada" ? "text-green-700" : m.tipo === "mixto" ? "text-[#b45309]" : m.tipo === "ajuste" ? "text-blue-600" : "text-red-600"}`}>
                    {m.tipo === "entrada" ? "📥 +" : m.tipo === "mixto" ? "🍬 " : m.tipo === "ajuste" ? "✏️ " : "📤 −"}{m.cantidad}
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
        <EmpezarNuevoDia action={empezarNuevoDia} />
      </section>

      <RetirosDepto destino="bodega" acento="#b45309" />
    </div>
  );
}
