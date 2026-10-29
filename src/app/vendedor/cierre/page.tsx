import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { devolverTodoABodega } from "../actions";
import CuadreCaja from "./CuadreCaja";
import PlanillaReparto from "./PlanillaReparto";
import SubirComprobante from "./SubirComprobante";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";

export const dynamic = "force-dynamic";

// Rendir cuentas: cuadra la mercadería del camión con las ventas del día y el
// dinero (efectivo / transferencia / fiado). Muestra el efectivo que debería
// tener, los fiados pendientes por sector y cliente, permite subir el comprobante
// de cada transferencia, y enviar el detalle por WhatsApp. Todo retráctil.

export default async function RendirCuentasPage() {
  const u = await usuarioActual();
  const usuario = u ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true, nombre: true } }) : null;
  const vehId = usuario?.vehiculoId ?? null;

  if (!vehId) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧾 Rendir cuentas</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Primero elige tu vehículo en <Link href="/vendedor/camion" className="font-semibold text-[#1479c4]">Camión</Link>.
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // MIS ventas del día (por vendedor) con cliente y productos; pagos recibidos hoy.
  const [ventasHoy, pagosHoy, stockCamion, movsHoy] = await Promise.all([
    prisma.venta.findMany({
      where: { vendedorId: u?.sub ?? "", fecha: { gte: hoy } },
      include: {
        pagos: { select: { monto: true, medio: true } },
        negocio: { select: { nombreNegocio: true, sector: true, comuna: true } },
        items: { select: { nombre: true, cantidad: true, precioUnit: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.pago.findMany({
      where: { fecha: { gte: hoy }, venta: { vendedorId: u?.sub ?? "" } },
      select: { id: true, medio: true, monto: true, comprobante: true, venta: { select: { negocio: { select: { nombreNegocio: true } } } } },
    }),
    prisma.stock.findMany({ where: { ubicacionId: vehId, cantidad: { gt: 0 } }, include: { producto: { select: { nombre: true } } } }),
    prisma.movimientoStock.findMany({
      where: { fecha: { gte: hoy }, OR: [{ ubicacionOrigenId: vehId }, { ubicacionDestinoId: vehId }] },
      include: { producto: { select: { nombre: true } } },
    }),
  ]);

  // ---- Cuadre de mercadería: cargó vs vendió vs volvió vs queda ----
  type FilaCuadre = { id: string; nombre: string; cargo: number; vendio: number; volvio: number; queda: number };
  const cuadre = new Map<string, FilaCuadre>();
  const filaDe = (id: string, nombre: string) => {
    let f = cuadre.get(id);
    if (!f) { f = { id, nombre, cargo: 0, vendio: 0, volvio: 0, queda: 0 }; cuadre.set(id, f); }
    return f;
  };
  for (const m of movsHoy) {
    const f = filaDe(m.productoId, m.producto.nombre);
    if (m.tipo === "transferencia" && m.ubicacionDestinoId === vehId) f.cargo += m.cantidad;
    else if (m.tipo === "venta" && m.ubicacionOrigenId === vehId) f.vendio += m.cantidad;
    else if (m.tipo === "transferencia" && m.ubicacionOrigenId === vehId) f.volvio += m.cantidad;
  }
  for (const s of stockCamion) filaDe(s.productoId, s.producto.nombre).queda += s.cantidad;
  const filasCuadre = [...cuadre.values()]
    .map((f) => ({ ...f, falta: f.cargo - f.vendio - f.volvio - f.queda }))
    .filter((f) => f.cargo || f.vendio || f.volvio || f.queda)
    .sort((a, b) => b.falta - a.falta || a.nombre.localeCompare(b.nombre));
  const totCargo = filasCuadre.reduce((s, f) => s + f.cargo, 0);
  const totVendio = filasCuadre.reduce((s, f) => s + f.vendio, 0);
  const totVolvio = filasCuadre.reduce((s, f) => s + f.volvio, 0);
  const totQueda = filasCuadre.reduce((s, f) => s + f.queda, 0);
  const totFalta = totCargo - totVendio - totVolvio - totQueda;

  // ---- Valor de reparto (margen distribución vs venta) ----
  const prodIds = [...cuadre.keys()];
  const [distLista, prodsInfo] = await Promise.all([
    prisma.listaPrecio.findFirst({ where: { canal: "distribuidor", activo: true } }),
    prodIds.length ? prisma.producto.findMany({ where: { id: { in: prodIds } }, select: { id: true, unidadesPack: true } }) : Promise.resolve([]),
  ]);
  const distPrecios = distLista && prodIds.length
    ? await prisma.precioProducto.findMany({ where: { listaId: distLista.id, cantidadMinima: 1, productoId: { in: prodIds } }, select: { productoId: true, precio: true } })
    : [];
  const distDe = new Map(distPrecios.map((p) => [p.productoId, Number(p.precio)]));
  const packDe = new Map(prodsInfo.map((p) => [p.id, p.unidadesPack ?? 0]));
  const filasReparto = filasCuadre.filter((f) => f.vendio > 0).map((f) => {
    const pack = packDe.get(f.id) ?? 0;
    const unidades = f.vendio * (pack > 0 ? pack : 1);
    const distUnit = distDe.get(f.id) ?? 0;
    return { nombre: f.nombre, vendio: f.vendio, unidades, distUnit, distCost: unidades * distUnit };
  });
  const costoDistrib = filasReparto.reduce((s, f) => s + f.distCost, 0);

  // ---- Dinero ----
  const vendido = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
  const efectivo = pagosHoy.filter((p) => p.medio === "efectivo").reduce((s, p) => s + Number(p.monto), 0);
  const transferencias = pagosHoy.filter((p) => p.medio === "transferencia");
  const totalTransfer = transferencias.reduce((s, p) => s + Number(p.monto), 0);
  const otros = pagosHoy.filter((p) => !["efectivo", "transferencia"].includes(p.medio)).reduce((s, p) => s + Number(p.monto), 0);
  const valorReparto = vendido - costoDistrib;
  const hayDist = distDe.size > 0;

  // ---- Fiados pendientes del día, por sector → cliente ----
  type Fiado = { cliente: string; saldo: number };
  const porSector = new Map<string, Fiado[]>();
  let totalFiado = 0;
  for (const v of ventasHoy) {
    const pagado = v.pagos.reduce((a, p) => a + Number(p.monto), 0);
    const saldo = Number(v.total) - pagado;
    if (saldo <= 0) continue;
    totalFiado += saldo;
    const sector = v.negocio?.sector || v.negocio?.comuna || "Sin sector";
    const cliente = v.negocio?.nombreNegocio || "Cliente";
    const arr = porSector.get(sector) ?? [];
    const ex = arr.find((x) => x.cliente === cliente);
    if (ex) ex.saldo += saldo; else arr.push({ cliente, saldo });
    porSector.set(sector, arr);
  }
  const fiadosSectores = [...porSector.entries()].map(([sector, items]) => ({
    sector, items: items.sort((a, b) => b.saldo - a.saldo), total: items.reduce((s, x) => s + x.saldo, 0),
  })).sort((a, b) => b.total - a.total);

  const clientes = new Set(ventasHoy.map((v) => v.negocioId)).size;
  const quedan = stockCamion.reduce((s, x) => s + x.cantidad, 0);

  // ---- Texto para enviar por WhatsApp ----
  const fechaTxt = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  const msg = [
    `🧾 *Rendición de ruta* — ${usuario?.nombre ?? "Vendedor"}`,
    fechaTxt,
    "",
    `Vendido: ${fmtCLP(vendido)}  ·  ${ventasHoy.length} ventas · ${clientes} clientes`,
    `💵 Efectivo esperado: ${fmtCLP(efectivo)}`,
    `🏦 Transferencias: ${fmtCLP(totalTransfer)}${transferencias.length ? ` (${transferencias.length})` : ""}`,
    otros > 0 ? `Otros: ${fmtCLP(otros)}` : null,
    `📝 Fiado pendiente: ${fmtCLP(totalFiado)}`,
    ...(fiadosSectores.length ? ["", "*Fiados por sector:*", ...fiadosSectores.flatMap((s) => [
      `• ${s.sector}: ${fmtCLP(s.total)}`,
      ...s.items.map((c) => `   - ${c.cliente}: ${fmtCLP(c.saldo)}`),
    ])] : []),
    "",
    `📦 Mercadería: cargó ${totCargo} · vendió ${totVendio} · queda ${totQueda}${totFalta !== 0 ? ` · ⚠️ falta ${Math.abs(totFalta)}` : " · ✅ cuadra"}`,
  ].filter((l): l is string => l !== null).join("\n");

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧾 Rendir cuentas</h1>
        <p className="text-xs text-slate-500">{fechaTxt} · cuadra dinero y mercadería del día.</p>
      </div>

      {/* Resumen (siempre visible) */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Vendido hoy" valor={fmtCLP(vendido)} />
        <Stat label="💵 Efectivo esperado" valor={fmtCLP(efectivo)} />
        <Stat label="🏦 Transferencias" valor={fmtCLP(totalTransfer)} />
        <Stat label="📝 Fiado pendiente" valor={fmtCLP(totalFiado)} rojo={totalFiado > 0} />
      </div>

      {/* Dinero / efectivo esperado */}
      <Panel titulo="💵 Dinero del día" abierto>
        <div className="space-y-1 text-sm">
          <Row label="Efectivo esperado" valor={fmtCLP(efectivo)} />
          <Row label="Transferencias" valor={fmtCLP(totalTransfer)} />
          {otros > 0 && <Row label="Otros medios" valor={fmtCLP(otros)} />}
          <Row label="A crédito (fiado)" valor={fmtCLP(totalFiado)} />
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <CuadreCaja esperado={efectivo} />
        </div>
      </Panel>

      {/* Transferencias con comprobante */}
      <Panel titulo={`🏦 Transferencias (${transferencias.length})`}>
        {transferencias.length === 0 ? (
          <p className="text-sm text-slate-500">Sin transferencias hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {transferencias.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate font-semibold text-slate-800">{p.venta?.negocio?.nombreNegocio ?? "Cliente"}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{fmtCLP(Number(p.monto))}</span>
                  <SubirComprobante pagoId={p.id} yaTiene={!!p.comprobante} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">📎 Toca “subir comprobante” para adjuntar la foto o el pantallazo de cada transferencia.</p>
      </Panel>

      {/* Fiados por sector / cliente */}
      <Panel titulo={`📝 Fiados por sector (${fmtCLP(totalFiado)})`}>
        {fiadosSectores.length === 0 ? (
          <p className="text-sm text-emerald-600">✅ No quedó nada fiado hoy.</p>
        ) : (
          <div className="space-y-3">
            {fiadosSectores.map((s) => (
              <div key={s.sector}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">📍 {s.sector}</h3>
                  <span className="text-sm font-extrabold text-red-600">{fmtCLP(s.total)}</span>
                </div>
                <ul className="mt-1 divide-y divide-slate-100 text-sm">
                  {s.items.map((c) => (
                    <li key={c.cliente} className="flex justify-between py-1">
                      <span className="text-slate-700">{c.cliente}</span>
                      <span className="font-semibold text-red-600">{fmtCLP(c.saldo)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Cuadre de mercadería */}
      <Panel titulo="📦 Cuadre de mercadería">
        {filasCuadre.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no cargaste mercadería hoy.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <TotCol label="Cargó" valor={totCargo} color="#1479c4" />
              <TotCol label="Vendió" valor={totVendio} color="#16a34a" />
              <TotCol label="Volvió" valor={totVolvio} color="#64748b" />
              <TotCol label="Queda" valor={totQueda} color="#64748b" />
            </div>
            <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-extrabold ${totFalta === 0 ? "bg-green-50 text-green-700" : totFalta > 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
              <span>{totFalta === 0 ? "✅ Cuadra perfecto" : totFalta > 0 ? "⚠️ Falta mercadería" : "❔ Sobra (revisar)"}</span>
              <span>{totFalta === 0 ? "0" : `${Math.abs(totFalta)} u.`}</span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 text-left font-bold">Producto</th>
                    <th className="py-1 text-right font-bold">Cargó</th>
                    <th className="py-1 text-right font-bold">Vendió</th>
                    <th className="py-1 text-right font-bold">Volvió</th>
                    <th className="py-1 text-right font-bold">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasCuadre.map((f) => (
                    <tr key={f.nombre}>
                      <td className="py-1.5 pr-2 font-semibold text-slate-800">{f.nombre}</td>
                      <td className="py-1.5 text-right text-slate-700">{f.cargo}</td>
                      <td className="py-1.5 text-right font-semibold text-green-700">{f.vendio}</td>
                      <td className="py-1.5 text-right text-slate-500">{f.volvio + f.queda}</td>
                      <td className={`py-1.5 text-right font-extrabold ${f.falta === 0 ? "text-slate-400" : f.falta > 0 ? "text-red-600" : "text-amber-600"}`}>
                        {f.falta === 0 ? "—" : f.falta > 0 ? f.falta : `+${-f.falta}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {quedan > 0 && (
              <form action={devolverTodoABodega} className="mt-3">
                <button className="w-full rounded-xl bg-[#1479c4] py-3 text-sm font-extrabold text-white active:brightness-95">↩️ Devolver lo que queda a bodega ({quedan} u.)</button>
              </form>
            )}
          </>
        )}
      </Panel>

      {/* Valor de reparto */}
      <Panel titulo="💵 Valor de reparto (para la central)">
        {!hayDist ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">⚠️ Falta cargar la lista de precios <b>Distribuidor</b> en el panel para calcular el reparto.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <TotMoney label="Vendido" valor={vendido} color="#16a34a" />
              <TotMoney label="Costo distrib." valor={costoDistrib} color="#64748b" />
              <TotMoney label="Reparto" valor={valorReparto} color="#b45309" />
            </div>
            <PlanillaReparto filas={filasReparto} vendido={vendido} costoDistrib={costoDistrib} valorReparto={valorReparto} />
          </>
        )}
      </Panel>

      {/* Detalle del día (archivado: cliente + productos, para análisis) */}
      <Panel titulo={`🧺 Detalle del día (${ventasHoy.length} ventas)`}>
        {ventasHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ventas registradas hoy.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {ventasHoy.map((v) => {
              const pagado = v.pagos.reduce((a, p) => a + Number(p.monto), 0);
              const saldo = Number(v.total) - pagado;
              const detalle = v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
              return (
                <li key={v.id} className="rounded-lg border border-slate-100 p-2">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0 truncate font-semibold text-slate-800">{v.negocio?.nombreNegocio ?? "Cliente"}</span>
                    <span className="font-bold text-slate-900">{fmtCLP(Number(v.total))}</span>
                  </div>
                  {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
                  {saldo > 0 && <p className="text-[11px] font-bold text-red-600">debe {fmtCLP(saldo)}</p>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Queda guardado por día (cliente y productos) para el análisis de la central.</p>
      </Panel>

      {/* Enviar rendición por WhatsApp */}
      <EnviarWhatsApp texto={msg} />

      <div className="pt-1 text-center">
        <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Volver al inicio</Link>
      </div>
    </div>
  );
}

function Panel({ titulo, abierto, children }: { titulo: string; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-900">{titulo}</summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

function Stat({ label, valor, rojo }: { label: string; valor: string; rojo?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className={`text-lg font-extrabold ${rojo ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function TotCol({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <p className="text-xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function TotMoney({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <p className="text-base font-extrabold tabular-nums" style={{ color }}>{fmtCLP(valor)}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{valor}</span>
    </div>
  );
}
