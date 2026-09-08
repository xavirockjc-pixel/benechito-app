// Venta por voz: interpreta lo dictado en canal + líneas (cantidad y producto).
// Ej: "3 chocolates y 2 trufas a distribuidor" → canal:distribuidor, [3 chocolate, 2 trufa].

export const CANALES_VENTA = {
  local: { label: "Local", icon: "🏪", lista: "sala", ventaCanal: "local" },
  ruta: { label: "Ruta", icon: "🚚", lista: "reparto", ventaCanal: "ruta" },
  distribuidor: { label: "Distribuidor", icon: "🏭", lista: "distribuidor", ventaCanal: "distribuidor" },
} as const;
export type CanalVenta = keyof typeof CANALES_VENTA;

export function normalizaVV(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const NUM_PALABRA: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100,
};

// Palabras que no forman parte del nombre del producto.
const STOP = new Set([
  "de", "del", "a", "al", "en", "para", "y", "con", "el", "la", "los", "las", "lo",
  "vendi", "vende", "vendo", "vender", "vendidos", "vendida", "vendidas", "sale", "salieron",
  "unidad", "unidades", "por", "mas",
]);

/** Detecta el canal por lo dictado. Por defecto: local. */
export function detectaCanalVV(t: string): CanalVenta {
  if (/(distribuidor|mayorista|mayoreo|por mayor|revendedor)/.test(t)) return "distribuidor";
  if (/(ruta|reparto|repartidor|terreno|delivery)/.test(t)) return "ruta";
  return "local";
}

function parseNumToken(tok: string): number | null {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  if (tok in NUM_PALABRA) return NUM_PALABRA[tok];
  return null;
}

export type LineaVV = { cantidad: number; nombre: string };

/** Convierte el texto dictado en líneas de venta (cantidad + nombre). */
export function parseVentaVoz(texto: string): { canal: CanalVenta; lineas: LineaVV[] } {
  const norm = normalizaVV(texto);
  const canal = detectaCanalVV(norm);

  // Quita las palabras del canal para que no ensucien el nombre del producto.
  const limpio = norm
    .replace(/(a |al |para |en )?(distribuidor|mayorista|mayoreo|por mayor|revendedor|ruta|reparto|repartidor|terreno|delivery|local|sala|mostrador)/g, " ");

  const tokens = limpio.split(/[^a-z0-9]+/).filter(Boolean);
  const lineas: LineaVV[] = [];
  let actual: LineaVV | null = null;

  for (const tok of tokens) {
    const n = parseNumToken(tok);
    if (n != null) {
      if (actual && actual.nombre.trim()) lineas.push(actual);
      actual = { cantidad: n, nombre: "" };
    } else if (actual && !STOP.has(tok)) {
      actual.nombre += (actual.nombre ? " " : "") + tok;
    }
  }
  if (actual && actual.nombre.trim()) lineas.push(actual);

  return { canal, lineas };
}
