// Reparto: parseo de pedidos de WhatsApp (extraer ubicación del propio mensaje)
// y utilidades de orden de ruta por cercanía.

export type PedidoParseado = {
  pedido: string;
  telefono: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  direccion: string | null;
};

const rangoCL = (lat: number, lng: number) =>
  lat >= -56 && lat <= -17 && lng >= -76 && lng <= -66; // Chile aprox (evita falsos positivos)
const rangoMundo = (lat: number, lng: number) =>
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Intenta sacar coordenadas (lat,lng) de un texto o link de Maps/Waze. */
export function extraerCoords(texto: string): { lat: number; lng: number } | null {
  const t = texto.replace(/\s+/g, " ");
  const patrones: RegExp[] = [
    /@(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/, // google maps @lat,lng
    /[?&](?:q|query|ll|destination|daddr)=(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/i, // q=/ll=/destination=
    /!3d(-?\d{1,3}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/, // place url
    /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/, // coords sueltas "-33.1234,-70.5678"
  ];
  for (const re of patrones) {
    const m = t.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (rangoMundo(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/** Primer link de Maps/Waze que aparezca en el texto (para abrir aunque no haya coords). */
export function extraerMapsUrl(texto: string): string | null {
  const m = texto.match(/https?:\/\/[^\s]*(google\.[^\s]*\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google|waze\.com)[^\s]*/i);
  return m ? m[0] : null;
}

/** Teléfono chileno en el texto (+569XXXXXXXX / 9XXXXXXXX). */
export function extraerTelefono(texto: string): string | null {
  const m = texto.match(/(?:\+?56)?\s*9\s*(?:\d\s*){8}/);
  if (!m) return null;
  const d = m[0].replace(/\D/g, "");
  const n = d.startsWith("56") ? d.slice(2) : d;
  return n.length === 9 ? "56" + n : null;
}

/** Parsea un mensaje de WhatsApp: deja el pedido limpio y saca ubicación/teléfono. */
export function parsearPedidoWhatsapp(texto: string): PedidoParseado {
  const coords = extraerCoords(texto);
  const mapsUrl = extraerMapsUrl(texto);
  const telefono = extraerTelefono(texto);
  // El "pedido" es el texto sin el link de mapa (queda más limpio).
  let pedido = texto;
  if (mapsUrl) pedido = pedido.replace(mapsUrl, "").trim();
  pedido = pedido.replace(/\n{3,}/g, "\n\n").trim();
  return { pedido, telefono, lat: coords?.lat ?? null, lng: coords?.lng ?? null, mapsUrl, direccion: null };
}

/** Distancia aproximada en km entre dos puntos (haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ordena puntos por "vecino más cercano" desde un origen. Los sin coords van al final. */
export function ordenarPorCercania<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  origen: { lat: number; lng: number },
): T[] {
  const conCoords = items.filter((i) => i.lat != null && i.lng != null) as (T & { lat: number; lng: number })[];
  const sinCoords = items.filter((i) => i.lat == null || i.lng == null);
  const ordenados: T[] = [];
  let actual = origen;
  const pend = [...conCoords];
  while (pend.length) {
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < pend.length; i++) {
      const d = distanciaKm(actual, pend[i]);
      if (d < best) { best = d; idx = i; }
    }
    const next = pend.splice(idx, 1)[0];
    ordenados.push(next);
    actual = { lat: next.lat, lng: next.lng };
  }
  return [...ordenados, ...sinCoords];
}

/** Link para abrir en Google Maps (coords o el link original). */
export function linkMaps(p: { lat?: number | null; lng?: number | null; mapsUrl?: string | null }): string | null {
  if (p.lat != null && p.lng != null) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  return p.mapsUrl ?? null;
}

export { rangoCL };

// ===== Venta por dictado (ventas especiales, flexible) =====
export type LineaVenta = { producto: string; cantidad: number; precioUnit: number };

const aNumero = (s: string) => parseInt(s.replace(/[.\s]/g, ""), 10) || 0; // "13.500" -> 13500

/**
 * Parsea una venta dictada, flexible: "200 tú y yo a 270", "200 tuyo a 13.500 la
 * bolsa de 50", "3 bolsas de trufa a 9000". Devuelve líneas editables (el precio
 * por unidad se calcula; si no se puede, queda 0 para completar a mano).
 */
export function parsearVentaDictada(texto: string): { lineas: LineaVenta[]; total: number } {
  const lineas: LineaVenta[] = [];
  for (const parteRaw of texto.split(/\n|;|,| y /i)) {
    const parte = parteRaw.trim();
    if (!parte) continue;
    // Separa "<cant+producto>  a  <precio...>"
    const mA = parte.match(/^(.*?)\ba\s+\$?\s*([\d.\s]+)(.*)$/i);
    const izq = (mA ? mA[1] : parte).trim();
    const precioTxt = mA ? mA[2] : "";
    const cola = mA ? mA[3] : "";

    // cantidad = primer número de la izquierda; producto = el resto
    const mCant = izq.match(/(\d[\d.]*)/);
    const cantidad = mCant ? aNumero(mCant[1]) : 0;
    const producto = izq.replace(mCant ? mCant[0] : "", "").replace(/\b(bolsas?|packs?|cajas?|sacos?|de)\b/gi, " ").replace(/\s+/g, " ").trim();
    if (!producto || cantidad <= 0) continue;

    let precioUnit = 0;
    if (precioTxt) {
      const precio = aNumero(precioTxt);
      // ¿Es precio por bulto? "la bolsa de 50", "el pack de 12"…
      const mBulto = cola.match(/\b(?:la\s+bolsa|el\s+pack|la\s+caja|el\s+saco)\b(?:\s+de\s+(\d+))?/i);
      if (mBulto) {
        const tam = mBulto[1] ? parseInt(mBulto[1], 10) : 0;
        precioUnit = tam > 0 ? Math.round(precio / tam) : 0; // sin tamaño → queda 0 para completar
      } else {
        precioUnit = precio; // precio por unidad
      }
    }
    lineas.push({ producto, cantidad, precioUnit });
  }
  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);
  return { lineas, total };
}
