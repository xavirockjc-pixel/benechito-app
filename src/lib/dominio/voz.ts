// Dominio: interpretación de comandos de voz para la venta. Función pura (sin
// dependencias), convierte lo que dijo el vendedor en cambios al carrito.
// Ej: "tres trufas y dos paletas de leche" → [{trufas:+3},{paleta de leche:+2}]
//     "quita una trufa"                     → [{trufas:-1}]

export type ProdVoz = { id: string; nombre: string };
export type CambioVoz = { productoId: string; delta: number; nombre: string };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Palabras-número en español (0–20) + docenas.
const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, docena: 12,
};

// Palabras que indican RESTAR.
const RESTAR = ["quita", "quitar", "quitame", "saca", "sacar", "sacame", "resta", "restar", "menos", "elimina", "eliminar", "borra", "borrar", "remueve", "remover"];

// Palabras a ignorar al comparar nombres de producto.
const RELLENO = new Set(["de", "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "con", "por", "favor", "agrega", "agregar", "agregame", "suma", "sumar", "sumame", "pon", "poner", "ponme", "mas", "otra", "otro"]);

/** Interpreta una frase completa y devuelve los cambios al carrito. */
export function interpretarComandoVenta(texto: string, productos: ProdVoz[]): CambioVoz[] {
  const prods = productos.map((p) => ({ ...p, tokens: norm(p.nombre).split(" ").filter((w) => !RELLENO.has(w)) }));

  // Divide en segmentos por conectores (una orden por segmento).
  const segmentos = norm(texto).split(/\s+(?:y|mas|ademas|tambien|luego|despues)\s+|,/).map((s) => s.trim()).filter(Boolean);

  const acumulado = new Map<string, CambioVoz>();

  for (const seg of segmentos) {
    const palabras = seg.split(" ");
    const restar = palabras.some((w) => RESTAR.includes(w));

    // "media docena" = 6
    let cantidad: number | null = null;
    if (seg.includes("media docena")) cantidad = 6;
    if (cantidad === null) {
      for (const w of palabras) {
        if (/^\d+$/.test(w)) { cantidad = parseInt(w, 10); break; }
        if (w in NUMEROS) { cantidad = NUMEROS[w]; break; }
      }
    }
    if (cantidad === null) cantidad = 1;
    if (cantidad <= 0) continue;

    // Empareja el producto: el que tenga más tokens coincidentes en el segmento.
    const segTokens = palabras.filter((w) => !RELLENO.has(w) && !RESTAR.includes(w) && !(w in NUMEROS) && !/^\d+$/.test(w));
    let mejor: { p: (typeof prods)[number]; score: number } | null = null;
    for (const p of prods) {
      let score = 0;
      for (const pt of p.tokens) {
        if (segTokens.some((st) => coincide(st, pt))) score++;
      }
      if (score > 0 && (!mejor || score > mejor.score)) mejor = { p, score };
    }
    if (!mejor) continue;

    const delta = restar ? -cantidad : cantidad;
    const prev = acumulado.get(mejor.p.id);
    if (prev) prev.delta += delta;
    else acumulado.set(mejor.p.id, { productoId: mejor.p.id, delta, nombre: mejor.p.nombre });
  }

  return [...acumulado.values()].filter((c) => c.delta !== 0);
}

/** Dos palabras coinciden si son iguales o comparten la raíz (tolera plurales: trufa/trufas). */
function coincide(a: string, b: string): boolean {
  if (a === b) return true;
  const raiz = (w: string) => (w.length >= 4 ? w.slice(0, Math.min(w.length, 5)).replace(/s$/, "") : w);
  const ra = raiz(a), rb = raiz(b);
  if (ra.length < 3 || rb.length < 3) return a === b;
  return ra === rb || a.startsWith(rb) || b.startsWith(ra);
}
