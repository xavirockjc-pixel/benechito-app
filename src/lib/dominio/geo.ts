// Dominio: utilidades de ubicación (geo). Funciones puras, seguras de usar en el
// navegador (sin dependencias de servidor). Sirven para ingresar la ubicación a mano.

export type Coords = { lat: number; lng: number };

function armar(a: string, b: string): Coords | null {
  const lat = Number(a);
  const lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Extrae { lat, lng } desde texto libre: coordenadas "lat, lng" pegadas a mano
 * o un enlace de Google Maps que contenga las coordenadas. Devuelve null si no encuentra.
 *
 * OJO: los enlaces cortos tipo "maps.app.goo.gl/xxxx" NO traen las coordenadas
 * adentro (redirigen), así que esos no se pueden leer. En ese caso conviene pegar
 * las coordenadas (los dos números) que Google muestra al mantener presionado el mapa.
 */
export function parseCoords(texto: string): Coords | null {
  if (!texto) return null;
  const t = texto.trim();

  // 1) Enlace con @lat,lng  (ej: .../maps/@-37.0125,-73.1559,17z)
  const at = t.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) return armar(at[1], at[2]);

  // 2) Parámetro q= / query= / destination= / ll=  (ej: ?q=-37.01,-73.15)
  const q = t.match(/[?&](?:q|query|destination|ll|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  if (q) return armar(q[1], q[2]);

  // 3) Formato !3d<lat>!4d<lng> presente en algunos enlaces largos
  const d = t.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (d) return armar(d[1], d[2]);

  // 4) Solo dos números: "lat, lng" o "lat lng"
  const par = t.match(/^\s*(-?\d{1,3}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/);
  if (par) return armar(par[1], par[2]);

  return null;
}
