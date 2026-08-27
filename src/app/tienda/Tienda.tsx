"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { crearPedidoTienda } from "./actions";

type Prod = { id: string; nombre: string; descripcion: string | null; formato: string | null; seccion: string; fotoUrl: string | null; precio: number };
type Seccion = { codigo: string; label: string; icono: string };

// Placeholder cálido por sección cuando no hay foto (para que no se vea vacío).
const GRAD: Record<string, string> = {
  propio: "from-[#f28a1e] to-[#d8a944]",
  distribucion: "from-[#1479c4] to-[#0f5e9c]",
  ruta: "from-[#e0730c] to-[#f28a1e]",
  promo: "from-[#e23b2c] to-[#f28a1e]",
};

export default function Tienda({
  negocio, productos, secciones, sinConfig,
}: {
  negocio: string; productos: Prod[]; secciones: Seccion[]; sinConfig: boolean;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [seccion, setSeccion] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [entrega, setEntrega] = useState("retiro");

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) => setCart((c) => { const n = (c[id] ?? 0) - 1; const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x; });

  const items = useMemo(() => Object.entries(cart).map(([id, cant]) => {
    const p = productos.find((x) => x.id === id)!;
    return { ...p, cant, sub: p.precio * cant };
  }).filter((i) => i.nombre), [cart, productos]);
  const total = items.reduce((s, i) => s + i.sub, 0);
  const nUnid = items.reduce((s, i) => s + i.cant, 0);
  const carroJSON = JSON.stringify(items.map((i) => ({ productoId: i.id, cantidad: i.cant })));
  const visibles = seccion ? productos.filter((p) => p.seccion === seccion) : productos;

  return (
    <div className="min-h-screen bg-papel pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-crema-2/70 bg-crema/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-display text-xl font-extrabold tracking-tight text-tinta">{negocio}</span>
          <button onClick={() => nUnid > 0 && setAbierto(true)} className="relative rounded-full bg-white px-4 py-2 text-sm font-bold text-naranja shadow-sm ring-1 ring-crema-2">
            🛒 {nUnid > 0 && <span className="ml-1">{nUnid}</span>}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        {/* Hero */}
        <section className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-naranja to-dorado p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Tienda online</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{negocio}</h1>
          <p className="mt-2 max-w-md text-sm text-white/90 sm:text-base">Pide online y elige <b>retiro en el local</b> o <b>despacho a domicilio</b>. Fresco y artesanal. 🍧</p>
          <div className="mt-4 flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/20 px-3 py-1.5">🏪 Retiro</span>
            <span className="rounded-full bg-white/20 px-3 py-1.5">🛵 Despacho</span>
            <span className="rounded-full bg-white/20 px-3 py-1.5">💳 Pago en línea</span>
          </div>
        </section>

        {sinConfig ? (
          <div className="mt-6 rounded-2xl border border-dashed border-crema-2 bg-white p-8 text-center text-sm text-choco-2">
            La tienda aún no tiene productos publicados. (En el panel: <b>Catálogo → 📷 Fotos tienda</b>, sube fotos y marca “Publicar”, y ponles precio en la lista Web.)
          </div>
        ) : (
          <>
            {/* Secciones */}
            {secciones.length > 1 && (
              <div className="sticky top-[57px] z-10 -mx-4 mt-5 flex gap-2 overflow-x-auto bg-papel/95 px-4 py-2 backdrop-blur">
                <Chip activo={!seccion} onClick={() => setSeccion("")}>Todo</Chip>
                {secciones.map((s) => (
                  <Chip key={s.codigo} activo={seccion === s.codigo} onClick={() => setSeccion(s.codigo)}>{s.icono} {s.label}</Chip>
                ))}
              </div>
            )}

            {/* Productos */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibles.map((p) => {
                const grad = GRAD[p.seccion] ?? GRAD.propio;
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
                      <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-sm font-extrabold text-tinta shadow">{fmtCLP(p.precio)}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="font-bold leading-tight text-tinta">{p.nombre}</p>
                      {(p.descripcion || p.formato) && <p className="mt-0.5 line-clamp-2 text-xs text-choco-2">{p.descripcion || p.formato}</p>}
                      <div className="mt-3">
                        {cart[p.id] ? (
                          <div className="flex items-center justify-between rounded-xl bg-naranja/10 px-2 py-1.5">
                            <button onClick={() => sub(p.id)} className="h-8 w-8 rounded-lg bg-white text-lg font-bold text-naranja shadow-sm active:scale-90">−</button>
                            <span className="font-extrabold text-naranja">{cart[p.id]}</span>
                            <button onClick={() => add(p.id)} className="h-8 w-8 rounded-lg bg-white text-lg font-bold text-naranja shadow-sm active:scale-90">+</button>
                          </div>
                        ) : (
                          <button onClick={() => add(p.id)} className="w-full rounded-xl bg-naranja py-2.5 text-sm font-extrabold text-white shadow-sm transition active:scale-95 hover:brightness-105">Agregar</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Barra de carro */}
      {nUnid > 0 && !abierto && (
        <button onClick={() => setAbierto(true)} className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-4xl items-center justify-between bg-gradient-to-r from-naranja to-naranja-2 px-5 py-4 text-white shadow-2xl active:brightness-95">
          <span className="font-bold">🛒 {nUnid} producto{nUnid > 1 ? "s" : ""}</span>
          <span className="font-extrabold">{fmtCLP(total)} · Ver pedido →</span>
        </button>
      )}

      {/* Checkout */}
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
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="min-w-0 truncate text-tinta"><b>{i.cant}×</b> {i.nombre}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-tinta">{fmtCLP(i.sub)}</span>
                    <button onClick={() => sub(i.id)} className="h-6 w-6 rounded-md bg-crema-2 text-choco-2">−</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-crema-2 pt-2 text-lg font-extrabold text-tinta">
              <span>Total</span><span>{fmtCLP(total)}</span>
            </div>

            <form action={crearPedidoTienda} className="mt-4 space-y-2.5">
              <input type="hidden" name="carro" value={carroJSON} />
              <input name="nombre" required placeholder="Tu nombre" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <input name="telefono" required inputMode="tel" placeholder="Tu WhatsApp / teléfono" className="w-full rounded-xl border border-crema-2 bg-crema/40 px-4 py-3 text-sm outline-none focus:border-naranja" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEntrega("retiro")} className={`rounded-xl py-3 text-sm font-bold transition ${entrega === "retiro" ? "bg-naranja text-white shadow" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🏪 Retiro en local</button>
                <button type="button" onClick={() => setEntrega("despacho")} className={`rounded-xl py-3 text-sm font-bold transition ${entrega === "despacho" ? "bg-naranja text-white shadow" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🛵 Despacho</button>
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
    <button onClick={onClick} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${activo ? "bg-tinta text-white shadow" : "bg-white text-choco-2 ring-1 ring-crema-2"}`}>
      {children}
    </button>
  );
}
