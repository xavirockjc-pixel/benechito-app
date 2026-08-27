"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { crearPedidoTienda } from "./actions";

type Prod = { id: string; nombre: string; descripcion: string | null; formato: string | null; seccion: string; fotoUrl: string | null; precio: number };
type Seccion = { codigo: string; label: string; icono: string };

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
    <div className="min-h-screen bg-crema pb-28">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-crema-2 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="font-display text-xl font-extrabold text-azul">{negocio}</h1>
          <span className="rounded-full bg-azul/10 px-3 py-1 text-xs font-bold text-azul">🛒 Tienda</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {sinConfig ? (
          <div className="rounded-2xl border border-dashed border-crema-2 bg-white p-8 text-center text-sm text-choco-2">
            La tienda aún no tiene productos publicados. (En el panel: Catálogo → marca “Publicar en tienda” y pon precios en la lista Web.)
          </div>
        ) : (
          <>
            {/* Filtro por sección */}
            {secciones.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => setSeccion("")} className={`rounded-full px-4 py-2 text-sm font-bold ${!seccion ? "bg-azul text-white" : "bg-white text-choco-2 ring-1 ring-crema-2"}`}>Todo</button>
                {secciones.map((s) => (
                  <button key={s.codigo} onClick={() => setSeccion(s.codigo)} className={`rounded-full px-4 py-2 text-sm font-bold ${seccion === s.codigo ? "bg-azul text-white" : "bg-white text-choco-2 ring-1 ring-crema-2"}`}>{s.icono} {s.label}</button>
                ))}
              </div>
            )}

            {/* Grilla de productos */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibles.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-crema-2">
                  <div className="aspect-square w-full bg-crema-2/40">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.fotoUrl} alt={p.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">🍫</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold leading-tight text-choco">{p.nombre}</p>
                    {p.formato && <p className="text-xs text-choco-2">{p.formato}</p>}
                    <p className="mt-1 font-extrabold text-azul">{fmtCLP(p.precio)}</p>
                    {cart[p.id] ? (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-azul/10 px-2 py-1">
                        <button onClick={() => sub(p.id)} className="h-7 w-7 rounded-md bg-white text-lg font-bold text-azul">−</button>
                        <span className="font-bold text-azul">{cart[p.id]}</span>
                        <button onClick={() => add(p.id)} className="h-7 w-7 rounded-md bg-white text-lg font-bold text-azul">+</button>
                      </div>
                    ) : (
                      <button onClick={() => add(p.id)} className="mt-2 w-full rounded-lg bg-azul py-2 text-sm font-bold text-white active:scale-95">Agregar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Barra de carro */}
      {nUnid > 0 && !abierto && (
        <button onClick={() => setAbierto(true)} className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-3xl items-center justify-between bg-azul px-5 py-4 text-white shadow-2xl">
          <span className="font-bold">🛒 {nUnid} producto{nUnid > 1 ? "s" : ""}</span>
          <span className="font-extrabold">{fmtCLP(total)} · Ver pedido →</span>
        </button>
      )}

      {/* Checkout */}
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setAbierto(false)}>
          <div className="mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-choco">Tu pedido</h2>
              <button onClick={() => setAbierto(false)} className="text-sm font-semibold text-choco-2">cerrar</button>
            </div>

            <ul className="divide-y divide-crema-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="min-w-0 truncate text-choco">{i.cant}× {i.nombre}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-choco">{fmtCLP(i.sub)}</span>
                    <button onClick={() => sub(i.id)} className="rounded bg-crema-2 px-2 text-choco-2">−</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-crema-2 pt-2 text-lg font-extrabold text-choco">
              <span>Total</span><span>{fmtCLP(total)}</span>
            </div>

            <form action={crearPedidoTienda} className="mt-4 space-y-2">
              <input type="hidden" name="carro" value={carroJSON} />
              <input name="nombre" required placeholder="Tu nombre" className="w-full rounded-xl border border-crema-2 px-3 py-2.5 text-sm" />
              <input name="telefono" required inputMode="tel" placeholder="Tu WhatsApp / teléfono" className="w-full rounded-xl border border-crema-2 px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEntrega("retiro")} className={`rounded-xl py-2.5 text-sm font-bold ${entrega === "retiro" ? "bg-azul text-white" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🏪 Retiro en local</button>
                <button type="button" onClick={() => setEntrega("despacho")} className={`rounded-xl py-2.5 text-sm font-bold ${entrega === "despacho" ? "bg-azul text-white" : "bg-crema text-choco-2 ring-1 ring-crema-2"}`}>🛵 Despacho</button>
              </div>
              <input type="hidden" name="entrega" value={entrega} />
              {entrega === "despacho" && (
                <input name="direccion" placeholder="Dirección de despacho" className="w-full rounded-xl border border-crema-2 px-3 py-2.5 text-sm" />
              )}
              <textarea name="notas" rows={2} placeholder="Notas del pedido (opcional)" className="w-full rounded-xl border border-crema-2 px-3 py-2.5 text-sm" />
              <button className="w-full rounded-xl bg-naranja py-3.5 text-base font-extrabold text-white active:scale-95">
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
