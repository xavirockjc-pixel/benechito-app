// Detección de clientes/negocios duplicados: mismo RUT, mismo teléfono,
// nombre muy parecido o ubicación casi idéntica.

/** RUT normalizado: solo dígitos + K, en mayúscula (sin puntos ni guion). */
export function normalizarRut(v: string | null | undefined): string {
  return (v ?? "").toUpperCase().replace(/[^0-9K]/g, "");
}

/** Últimos 8 dígitos del teléfono (ignora prefijo/formato). */
export function colaTelefono(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "").slice(-8);
}

/** Nombre normalizado (minúsculas, sin tildes ni signos) para comparar. */
export function normalizarNombre(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distancia aproximada en metros entre dos coordenadas (haversine). */
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type NegocioCmp = {
  id: string;
  nombreNegocio: string;
  nombreContacto?: string | null;
  whatsapp?: string | null;
  rut?: string | null;
  comuna?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

/** Compara un candidato contra un negocio existente y devuelve el motivo de duplicado (o null). */
export function motivoDuplicado(
  cand: { nombre?: string; rut?: string; whatsapp?: string; latitud?: number | null; longitud?: number | null },
  ex: NegocioCmp,
): string | null {
  const rutC = normalizarRut(cand.rut);
  if (rutC && rutC.length >= 7 && rutC === normalizarRut(ex.rut)) return "mismo RUT";

  const telC = colaTelefono(cand.whatsapp);
  if (telC && telC.length >= 7 && telC === colaTelefono(ex.whatsapp)) return "mismo teléfono";

  const nomC = normalizarNombre(cand.nombre);
  const nomE = normalizarNombre(ex.nombreNegocio);
  if (nomC && nomC.length >= 3 && (nomC === nomE || nomE.includes(nomC) || nomC.includes(nomE))) return "nombre parecido";

  if (cand.latitud != null && cand.longitud != null && ex.latitud != null && ex.longitud != null) {
    if (distanciaMetros(cand.latitud, cand.longitud, ex.latitud, ex.longitud) < 40) return "misma ubicación";
  }
  return null;
}
