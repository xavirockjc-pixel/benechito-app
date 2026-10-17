"use client";

import { useEffect, useState } from "react";

/**
 * Carrusel "Cómo pedir por el carrito, paso a paso". Enseña al cliente a comprar
 * en la tienda online. Avanza solo y también se puede mover con los botones o los
 * puntos. Reutilizable en la landing y en la tienda.
 */

type Paso = { n: number; emoji: string; titulo: string; texto: string };

const PASOS: Paso[] = [
  { n: 1, emoji: "🛒", titulo: "Entra a la tienda", texto: "Abre la tienda online de Benechito desde tu teléfono y mira nuestros helados artesanales." },
  { n: 2, emoji: "🍦", titulo: "Elige tus productos", texto: "Toca «Agregar» en los helados que quieras. Puedes elegir el sabor de cada uno." },
  { n: 3, emoji: "💰", titulo: "Mientras más, más barato", texto: "El precio por unidad baja solo según cuánto llevas. El carrito calcula el total por ti." },
  { n: 4, emoji: "📍", titulo: "Retiro o despacho", texto: "Retira en el local (más rápido y sin costo) o pide despacho y comparte tu ubicación." },
  { n: 5, emoji: "📅", titulo: "Elige el día", texto: "Agenda cuándo lo quieres retirar o recibir. Así lo dejamos listo para ti." },
  { n: 6, emoji: "✅", titulo: "Envía y listo", texto: "Confirma el pedido y te escribimos por WhatsApp para coordinar el pago y la entrega." },
];

export default function ComoPedir({
  ctaHref,
  ctaLabel = "🍦 Ir a la tienda y pedir",
  compacto = false,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  compacto?: boolean;
}) {
  const [i, setI] = useState(0);
  const total = PASOS.length;
  const ir = (n: number) => setI(((n % total) + total) % total);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total]);

  const paso = PASOS[i];

  return (
    <div className={`mx-auto w-full max-w-xl ${compacto ? "" : "px-1"}`}>
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-crema-2">
        {/* Encabezado azul Benechito */}
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-azul to-azul-2 px-5 py-3 text-white">
          <span className="font-display text-base font-extrabold sm:text-lg">🛒 Cómo pedir, paso a paso</span>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{paso.n} / {total}</span>
        </div>

        {/* Paso actual */}
        <div className="flex min-h-[9.5rem] items-center gap-4 px-5 py-5 sm:px-7">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-crema text-4xl shadow-inner sm:h-20 sm:w-20 sm:text-5xl">
            {paso.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-naranja text-xs font-extrabold text-white">{paso.n}</span>
              <h3 className="font-display text-lg font-extrabold text-tinta sm:text-xl">{paso.titulo}</h3>
            </div>
            <p className="mt-1 text-sm text-choco-2">{paso.texto}</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-between gap-3 border-t border-crema-2 px-5 py-3">
          <button type="button" onClick={() => ir(i - 1)} aria-label="Paso anterior"
            className="grid h-9 w-9 place-items-center rounded-full bg-crema text-lg font-bold text-tinta active:scale-90">‹</button>
          <div className="flex flex-1 justify-center gap-1.5">
            {PASOS.map((p, idx) => (
              <button key={p.n} type="button" onClick={() => ir(idx)} aria-label={`Ir al paso ${p.n}`}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-5 bg-azul" : "w-2 bg-crema-2"}`} />
            ))}
          </div>
          <button type="button" onClick={() => ir(i + 1)} aria-label="Paso siguiente"
            className="grid h-9 w-9 place-items-center rounded-full bg-azul text-lg font-bold text-white active:scale-90">›</button>
        </div>
      </div>

      {ctaHref && (
        <div className="mt-4 text-center">
          <a href={ctaHref} className="inline-block rounded-full bg-gradient-to-r from-naranja to-naranja-2 px-7 py-3.5 text-base font-extrabold text-white shadow-lg transition active:scale-95 hover:-translate-y-0.5">
            {ctaLabel}
          </a>
        </div>
      )}
    </div>
  );
}
