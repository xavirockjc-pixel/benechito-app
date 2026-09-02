"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { whatsappLink } from "@/lib/config";
import { crearPedidoTienda } from "./actions";
import UbicacionCliente from "./UbicacionCliente";

type SaborInfo = { nombre: string; desc: string | null; foto: string | null };
type Prod = { id: string; nombre: string; descripcion: string | null; formato: string | null; seccion: string; fotoUrl: string | null; precios: Record<string, number>; sabores: SaborInfo[]; grupo: string; min: number; max: number };
type Tarifa = { codigo: string; label: string; icono: string; cond: string };

const GRUPOS = [
  { codigo: "helados", label: "Helados artesanales", icono: "🍧" },
  { codigo: "dulces", label: "Dulces artesanales", icono: "🍫" },
];

const GRAD: Record<string, string> = {
  propio: "from-[#f28a1e] to-[#d8a944]",
  distribucion: "from-[#1479c4] to-[#0f5e9c]",
  ruta: "from-[#e0730c] to-[#f28a1e]",
  promo: "from-[#e23b2c] to-[#f28a1e]",
};

const KEY = (id: string, sabor: string) => `${id}::${sabor}`;

export default function Tienda({
  negocio, logoUrl, productos, tarifas = [], sinConfig,
}: {
  negocio: string; logoUrl?: string; productos: Prod[]; tarifas?: Tarifa[]; sinConfig: boolean;
}) {
  const byId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const [cart, setCart] = useState<Record<string, number>>({}); // key = id::sabor -> cantidad
  const [sel, setSel] = useState<Record<string, string>>({}); // sabor elegido por producto
  const [tarifa, setTarifa] = useState(tarifas[0]?.codigo ?? "detalle");
  const [abierto, setAbierto] = useState(false);
  const [entrega, setEntrega] = useState("retiro");
  const [detalleSabor, setDetalleSabor] = useState<SaborInfo | null>(null); // modal "¿cómo es?"

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
  const gruposConProd = GRUPOS.filter((g) => productos.some((p) => p.grupo === g.codigo));
  const prodDeGrupo = (codigo: string) => productos.filter((p) => p.grupo === codigo);
  const waPunto = whatsappLink("¡Hola Benechito! Quiero llevar un Punto Benechito o inscribirme para reparto 🙌");
  const waComercial = whatsappLink("¡Hola Benechito! Tengo una consulta comercial 🙌");

  // Tarjeta de producto (se usa en las dos secciones).
  const renderCard = (p: Prod) => {
    const grad = GRAD[p.seccion] ?? GRAD.propio;
    const enCarro = enCarroProd(p.id);
    const saborSel = sel[p.id] ?? (p.sabores[0]?.nombre ?? "");
    const saborObj = p.sabores.find((s) => s.nombre === saborSel);
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
              <div className="flex items-center gap-1.5">
                <select value={saborSel} onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.value }))} className="min-w-0 flex-1 rounded-lg border border-crema-2 bg-crema/40 px-2 py-2 text-xs font-semibold text-tinta">
                  {p.sabores.map((sb) => <option key={sb.nombre} value={sb.nombre}>{sb.nombre}</option>)}
                </select>
                <button type="button" onClick={() => saborObj && setDetalleSabor(saborObj)} title="¿Cómo es este sabor?"
                  className="shrink-0 rounded-lg bg-azul/10 px-2 py-2 text-sm font-bold text-azul active:scale-90">ⓘ</button>
              </div>
            )}
            <button onClick={() => agregar(p.id, saborSel)} className="w-full rounded-xl bg-azul py-2.5 text-sm font-extrabold text-white shadow-sm transition active:scale-95 hover:bg-azul-2">
              Agregar{p.min > 1 ? ` ${p.min}` : ""}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-papel pb-28">
      {/* Fondo de sellos: paletas, chocolate, leche, frutas, frutos secos */}
      <div className="bg-sellos pointer-events-none fixed inset-0 opacity-[0.05]" />

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
        {/* Portada azul Benechito, horizontal, con productos */}
        <section className="relative mt-4 overflow-hidden rounded-[1.75rem] shadow-xl"
          style={{ background: "radial-gradient(circle at 50% 22%, #33abe6 0%, #1479c4 48%, #0f5e9c 100%)" }}>
          {/* rayos + sellos de marca de fondo */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-conic-gradient(from 0deg at 50% 18%, rgba(255,255,255,0.10) 0deg 7deg, transparent 7deg 15deg)" }} />
          <div className="bg-sellos pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="relative grid items-center gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {/* Texto + logo */}
            <div className="text-center sm:text-left">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={negocio} className="mx-auto h-24 w-auto drop-shadow-lg sm:mx-0 sm:h-28" />
              ) : (
                <h1 className="font-display text-4xl font-extrabold text-white drop-shadow">{negocio}</h1>
              )}
              <p className="script mt-1 text-2xl text-white drop-shadow-sm">Hecho a lo Benechito ♥</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-wider text-white/85">Productos Artesanales Helados</p>
              <p className="mt-3 font-display text-3xl font-extrabold leading-tight text-white drop-shadow sm:text-4xl">Irresistible <span className="text-dorado-2">Sabor Artesanal</span></p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-bold text-azul sm:justify-start">
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">🏪 Retiro</span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">🛵 Despacho</span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">💳 Pago en línea</span>
              </div>
            </div>
            {/* Vitrina de productos (helados) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {["/productos/tu-y-yo.jpg", "/productos/paletas-leche.jpg", "/productos/paletas-agua.jpg", "/productos/postres.jpg", "/productos/paletas-premium.jpg", "/productos/variedades.jpg"].map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="Producto Benechito" className="aspect-square w-full rounded-2xl object-cover shadow-lg ring-2 ring-white/70" />
              ))}
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

            {/* Selección rápida (salta a la sección, no oculta) */}
            {gruposConProd.length > 1 && (
              <div className="sticky top-[57px] z-10 -mx-4 mt-5 flex gap-2 bg-papel/95 px-4 py-2 backdrop-blur">
                {gruposConProd.map((g) => (
                  <a key={g.codigo} href={`#g-${g.codigo}`}
                    className={`flex-1 rounded-2xl px-4 py-3 text-center text-sm font-extrabold text-white shadow transition active:scale-95 ${g.codigo === "dulces" ? "bg-choco" : "bg-azul"}`}>
                    {g.icono} {g.label}
                  </a>
                ))}
              </div>
            )}

            {/* Secciones apiladas: primero Helados, luego Dulces (tipo landing) */}
            {gruposConProd.map((g) => (
              <section key={g.codigo} id={`g-${g.codigo}`} className="mt-8 scroll-mt-32">
                <div className="mb-4 flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-white shadow-md"
                  style={{ background: g.codigo === "dulces" ? "linear-gradient(90deg,#6b3f1d,#8a4b1e)" : "linear-gradient(90deg,#1479c4,#0f5e9c)" }}>
                  <span className="text-2xl">{g.icono}</span>
                  <h2 className="font-display text-xl font-extrabold sm:text-2xl">{g.label}</h2>
                  <span className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">{prodDeGrupo(g.codigo).length} productos</span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {prodDeGrupo(g.codigo).map((p) => renderCard(p))}
                </div>
              </section>
            ))}

            {/* Publicidad: reparto / Punto Benechito (con góndola de dulces) */}
            <section className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e6b3a] to-[#0f4d28] p-6 text-white shadow-xl sm:p-8">
              <div className="bg-sellos pointer-events-none absolute inset-0 opacity-[0.08]" />
              <div className="relative grid items-center gap-5 sm:grid-cols-2">
                <div className="text-center sm:text-left">
                  <span className="sello bg-white/15 script text-base text-white">¿Tienes un negocio? 🏪</span>
                  <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Lleva un <span className="text-dorado-2">Punto Benechito</span> o únete al reparto</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-white/90 sm:mx-0">Vende nuestros helados y dulces en tu local, o inscríbete para recibir reparto. Te entregamos la <b>góndola</b> y la primera reposición. Tú solo te preocupas de vender. 🍫</p>
                  <a href={waPunto} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-block rounded-full bg-white px-6 py-3.5 text-base font-extrabold text-[#1e6b3a] shadow-lg transition active:scale-95 hover:bg-crema">
                    📲 Quiero inscribirme
                  </a>
                </div>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/laminas/gondola-negocio.png" alt="Góndola Benechito con dulces artesanales" className="max-h-72 w-auto rounded-2xl shadow-2xl ring-2 ring-white/40" />
                </div>
              </div>
            </section>

            {/* Footer: redes y consultas comerciales */}
            <footer className="mt-8 rounded-3xl bg-tinta p-6 text-center text-white shadow-lg">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={negocio} className="mx-auto h-14 w-auto brightness-0 invert" />
              )}
              <p className="script mt-1 text-lg text-white/90">Hecho a lo Benechito ♥</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/60">Consultas comerciales</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <a href={waComercial} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-bold text-white active:scale-95">💬 WhatsApp</a>
                <a href="https://www.facebook.com/Benechito.helados/" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#1877f2] px-4 py-2.5 text-sm font-bold text-white active:scale-95">📘 Facebook</a>
                <a href="https://instagram.com/benechito.oficial" target="_blank" rel="noopener noreferrer" className="rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-4 py-2.5 text-sm font-bold text-white active:scale-95">📷 Instagram</a>
              </div>
              <p className="mt-4 text-[11px] text-white/50">@benechito.oficial · Productos Artesanales Helados</p>
            </footer>
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
                <>
                  <input name="direccion" placeholder="Dirección de despacho" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
                  <UbicacionCliente />
                </>
              )}
              {/* Agendar cuándo lo quiere */}
              <div className="rounded-xl bg-crema/40 p-3 ring-1 ring-crema-2">
                <p className="text-xs font-bold text-tinta">📅 ¿Cuándo lo {entrega === "despacho" ? "recibes" : "retiras"}?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input type="date" name="fecha" min={new Date().toLocaleDateString("en-CA")} className="w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm outline-none focus:border-naranja" />
                  <input type="time" name="hora" className="w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm outline-none focus:border-naranja" />
                </div>
                <p className="mt-1 text-[10px] text-choco-2">Opcional. Si lo dejas en blanco, coordinamos contigo.</p>
              </div>
              <textarea name="notas" rows={2} placeholder="Notas del pedido (opcional)" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <button className="w-full rounded-2xl bg-gradient-to-r from-naranja to-naranja-2 py-4 text-base font-extrabold text-white shadow-lg active:scale-95">
                Enviar pedido · {fmtCLP(total)}
              </button>
              <p className="text-center text-[11px] text-choco-2">Tu pedido llega a {negocio} y te contactan para confirmar el pago y la entrega.</p>
            </form>
          </div>
        </div>
      )}

      {/* Detalle del sabor: cómo es y de qué está hecho */}
      {detalleSabor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDetalleSabor(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {detalleSabor.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detalleSabor.foto} alt={detalleSabor.nombre} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-choco to-[#5a2d12] text-5xl">🍫</div>
            )}
            <div className="p-5">
              <span className="sello bg-azul/10 text-azul script text-sm">Sabor Benechito ♥</span>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-tinta">{detalleSabor.nombre}</h3>
              <p className="mt-2 text-sm text-choco-2">{detalleSabor.desc || "Pronto agregamos la descripción de este sabor. 🍧"}</p>
              <button onClick={() => setDetalleSabor(null)} className="mt-4 w-full rounded-xl bg-azul py-3 text-sm font-extrabold text-white active:scale-95">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
