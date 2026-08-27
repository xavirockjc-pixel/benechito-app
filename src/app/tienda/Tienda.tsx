"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { crearPedidoTienda } from "./actions";

type Prod = { id: string; nombre: string; descripcion: string | null; formato: string | null; seccion: string; fotoUrl: string | null; precios: Record<string, number>; sabores: string[]; min: number; max: number };
type Seccion = { codigo: string; label: string; icono: string };
type Tarifa = { codigo: string; label: string; icono: string; cond: string };

const GRAD: Record<string, string> = {
  propio: "from-[#f28a1e] to-[#d8a944]",
  distribucion: "from-[#1479c4] to-[#0f5e9c]",
  ruta: "from-[#e0730c] to-[#f28a1e]",
  promo: "from-[#e23b2c] to-[#f28a1e]",
};

const KEY = (id: string, sabor: string) => `${id}::${sabor}`;

export default function Tienda({
  negocio, logoUrl, productos, secciones, tarifas = [], sinConfig,
}: {
  negocio: string; logoUrl?: string; productos: Prod[]; secciones: Seccion[]; tarifas?: Tarifa[]; sinConfig: boolean;
}) {
  const byId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const [cart, setCart] = useState<Record<string, number>>({}); // key = id::sabor -> cantidad
  const [sel, setSel] = useState<Record<string, string>>({}); // sabor elegido por producto
  const [seccion, setSeccion] = useState("");
  const [tarifa, setTarifa] = useState(tarifas[0]?.codigo ?? "detalle");
  const [abierto, setAbierto] = useState(false);
  const [entrega, setEntrega] = useState("retiro");

  const precioDe = (p: Prod) => p.precios[tarifa] ?? Object.values(p.precios)[0] ?? 0;
  const minOf = (id: string) => Math.max(1, byId.get(id)?.min ?? 1);
  const maxOf = (id: string) => byId.get(id)?.max ?? 0;

  const agregar = (id: string, sabor: string) => setCart((c) => {
    const k = KEY(id, sabor);
    const actual = c[k] ?? 0;
    const max = maxOf(id);
    const next = actual === 0 ? minOf(id) : actual + 1;
    if (max > 0 && next > max) return c;
    return { ...c, [k]: next };
  });
  const setQty = (k: string, id: string, q: number) => setCart((c) => {
    const min = minOf(id); const max = maxOf(id);
    const x = { ...c };
    if (q < min) delete x[k]; // bajo el mínimo → se quita
    else x[k] = max > 0 ? Math.min(q, max) : q;
    return x;
  });

  const items = useMemo(() => Object.entries(cart).map(([k, cant]) => {
    const [id, sabor] = k.split("::");
    const p = byId.get(id);
    const pr = p ? (p.precios[tarifa] ?? Object.values(p.precios)[0] ?? 0) : 0;
    return p ? { k, id, sabor, p, cant, precio: pr, sub: pr * cant } : null;
  }).filter(Boolean) as { k: string; id: string; sabor: string; p: Prod; cant: number; precio: number; sub: number }[], [cart, byId, tarifa]);

  const total = items.reduce((s, i) => s + i.sub, 0);
  const nUnid = items.reduce((s, i) => s + i.cant, 0);
  const carroJSON = JSON.stringify(items.map((i) => ({ productoId: i.id, cantidad: i.cant, sabor: i.sabor || undefined })));
  const enCarroProd = (id: string) => items.filter((i) => i.id === id).reduce((s, i) => s + i.cant, 0);
  const visibles = seccion ? productos.filter((p) => p.seccion === seccion) : productos;

  return (
    <div className="relative min-h-screen bg-papel pb-28">
      {/* Fondo de doodles de dulces (temática de la web) */}
      <div className="bg-doodles pointer-events-none fixed inset-0 opacity-[0.06]" />

      <header className="sticky top-0 z-20 border-b border-crema-2/70 bg-crema/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={negocio} className="h-11 w-auto drop-shadow-sm" />
          ) : (
            <span className="font-display text-xl font-extrabold tracking-tight text-tinta">{negocio}</span>
          )}
          <button onClick={() => nUnid > 0 && setAbierto(true)} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-azul shadow-sm ring-1 ring-crema-2">
            🛒 {nUnid > 0 && <span className="ml-1">{nUnid}</span>}
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4">
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-crema-2 bg-gradient-to-b from-azul/10 via-crema/50 to-crema p-6 shadow-sm sm:p-8">
          <div className="bg-doodles pointer-events-none absolute inset-0 opacity-[0.10]" />
          <div className="relative">
            <span className="sello bg-azul/10 text-azul script text-base">Tienda online ♥</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-tinta sm:text-4xl">
              Helados y dulces artesanales, <span className="text-azul">pídelos online.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-tinta/75 sm:text-base">Elige <b className="text-naranja-2">retiro en el local</b> o <b className="text-naranja-2">despacho a domicilio</b>. Fresco y hecho a lo Benechito. 🍧</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-tinta/70">
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-crema-2">🏪 Retiro</span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-crema-2">🛵 Despacho</span>
              <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-crema-2">💳 Pago en línea</span>
            </div>
          </div>
        </section>

        {sinConfig ? (
          <div className="mt-6 rounded-2xl border border-dashed border-crema-2 bg-white p-8 text-center text-sm text-choco-2">
            La tienda aún no tiene productos publicados. (En el panel: <b>Catálogo → 📷 Fotos tienda</b>.)
          </div>
        ) : (
          <>
            {/* Selector de tarifa (tipo de cliente) — los precios cambian solos */}
            {tarifas.length > 1 && (
              <div className="mt-5 rounded-2xl border border-crema-2 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-choco-2">Ver precios como:</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {tarifas.map((t) => {
                    const activo = tarifa === t.codigo;
                    return (
                      <button key={t.codigo} onClick={() => setTarifa(t.codigo)}
                        className={`rounded-xl border-2 px-3 py-2 text-left transition active:scale-95 ${activo ? "border-azul bg-azul/10" : "border-crema-2 bg-white hover:border-crema-2"}`}>
                        <span className={`block text-sm font-extrabold ${activo ? "text-azul" : "text-tinta"}`}>{t.icono} {t.label}</span>
                        <span className="block text-[11px] text-choco-2">{t.cond}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {secciones.length > 1 && (
              <div className="sticky top-[57px] z-10 -mx-4 mt-5 flex gap-2 overflow-x-auto bg-papel/95 px-4 py-2 backdrop-blur">
                <Chip activo={!seccion} onClick={() => setSeccion("")}>Todo</Chip>
                {secciones.map((s) => (
                  <Chip key={s.codigo} activo={seccion === s.codigo} onClick={() => setSeccion(s.codigo)}>{s.icono} {s.label}</Chip>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibles.map((p) => {
                const grad = GRAD[p.seccion] ?? GRAD.propio;
                const enCarro = enCarroProd(p.id);
                const saborSel = sel[p.id] ?? (p.sabores[0] ?? "");
                return (
                  <div key={p.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-crema-2 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative aspect-square w-full overflow-hidden">
                      {p.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.fotoUrl} alt={p.nombre} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grad}`}>
                          <span className="font-display text-4xl font-extrabold text-white/90">{p.nombre.charAt(0)}</span>
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-sm font-extrabold text-tinta shadow">{fmtCLP(precioDe(p))}</span>
                      {enCarro > 0 && <span className="absolute right-2 top-2 rounded-full bg-azul px-2 py-0.5 text-xs font-bold text-white shadow">🛒 {enCarro}</span>}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="font-bold leading-tight text-tinta">{p.nombre}</p>
                      {(p.descripcion || p.formato) && <p className="mt-0.5 line-clamp-2 text-xs text-choco-2">{p.descripcion || p.formato}</p>}
                      {p.sabores.length > 0 && <p className="mt-0.5 text-[11px] font-semibold text-naranja">{p.sabores.length} sabores</p>}
                      {p.min > 1 && <p className="text-[11px] text-choco-2">Mínimo {p.min}{p.max > 0 ? ` · máx ${p.max}` : ""}</p>}

                      <div className="mt-2 space-y-2">
                        {p.sabores.length > 0 && (
                          <select value={saborSel} onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.value }))} className="w-full rounded-lg border border-crema-2 bg-crema/40 px-2 py-2 text-xs font-semibold text-tinta">
                            {p.sabores.map((sb) => <option key={sb} value={sb}>{sb}</option>)}
                          </select>
                        )}
                        <button onClick={() => agregar(p.id, saborSel)} className="w-full rounded-xl bg-azul py-2.5 text-sm font-extrabold text-white shadow-sm transition active:scale-95 hover:bg-azul-2">
                          Agregar{p.min > 1 ? ` ${p.min}` : ""}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {nUnid > 0 && !abierto && (
        <button onClick={() => setAbierto(true)} className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-4xl items-center justify-between bg-gradient-to-r from-azul to-azul-2 px-5 py-4 text-white shadow-2xl active:brightness-95">
          <span className="font-bold">🛒 {nUnid} producto{nUnid > 1 ? "s" : ""}</span>
          <span className="font-extrabold">{fmtCLP(total)} · Ver pedido →</span>
        </button>
      )}

      {abierto && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50 backdrop-blur-sm" onClick={() => setAbierto(false)}>
          <div className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-crema-2" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-tinta">Tu pedido</h2>
              <button onClick={() => setAbierto(false)} className="text-sm font-semibold text-choco-2">cerrar</button>
            </div>

            <ul className="divide-y divide-crema-2">
              {items.map((i) => (
                <li key={i.k} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-tinta">{i.p.nombre}{i.sabor ? <span className="text-naranja"> · {i.sabor}</span> : ""}</span>
                    <span className="text-xs text-choco-2">{fmtCLP(i.precio)} c/u</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setQty(i.k, i.id, i.cant - 1)} className="h-7 w-7 rounded-lg bg-crema-2 text-lg font-bold text-choco-2 active:scale-90">−</button>
                    <span className="w-6 text-center font-bold text-tinta">{i.cant}</span>
                    <button onClick={() => setQty(i.k, i.id, i.cant + 1)} className="h-7 w-7 rounded-lg bg-azul/15 text-lg font-bold text-azul active:scale-90">+</button>
                    <span className="w-16 text-right font-bold text-tinta">{fmtCLP(i.sub)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-crema-2 pt-2 text-lg font-extrabold text-tinta">
              <span>Total</span><span>{fmtCLP(total)}</span>
            </div>

            <form action={crearPedidoTienda} className="mt-4 space-y-2.5">
              <input type="hidden" name="carro" value={carroJSON} />
              <input type="hidden" name="tarifa" value={tarifa} />
              <input name="nombre" required placeholder="Tu nombre" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <input name="telefono" required inputMode="tel" placeholder="Tu WhatsApp / teléfono" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEntrega("retiro")} className={`rounded-xl py-3 text-sm font-bold transition ${entrega === "retiro" ? "bg-azul text-white shadow" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🏪 Retiro en local</button>
                <button type="button" onClick={() => setEntrega("despacho")} className={`rounded-xl py-3 text-sm font-bold transition ${entrega === "despacho" ? "bg-azul text-white shadow" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🛵 Despacho</button>
              </div>
              <input type="hidden" name="entrega" value={entrega} />
              {entrega === "despacho" && (
                <input name="direccion" placeholder="Dirección de despacho" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              )}
              <textarea name="notas" rows={2} placeholder="Notas del pedido (opcional)" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <button className="w-full rounded-2xl bg-gradient-to-r from-naranja to-naranja-2 py-4 text-base font-extrabold text-white shadow-lg active:scale-95">
                Enviar pedido · {fmtCLP(total)}
              </button>
              <p className="text-center text-[11px] text-choco-2">Tu pedido llega a {negocio} y te contactan para confirmar el pago y la entrega.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${activo ? "bg-azul text-white shadow" : "bg-white text-choco-2 ring-1 ring-crema-2"}`}>
      {children}
    </button>
  );
}
