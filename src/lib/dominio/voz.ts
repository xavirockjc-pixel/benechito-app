// Dominio: interpretación de comandos de voz. Función pura (sin dependencias),
// convierte lo que se dijo en cambios al carrito / stock.
// Ej: "tres trufas y dos paletas de leche" → [{trufas:+3},{paleta de leche:+2}]
//     "cincuenta tú y yo"                   → [{tú y yo:+50}]
//     "doscientos cincuenta vasos"          → [{vasos:+250}]
//     "quita una trufa"                     → [{trufas:-1}]

export type ProdVoz = { id: string; nombre: string };
export type CambioVoz = { productoId: string; delta: number; nombre: string };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Palabras-número en español: unidades, decenas, cientos y mil (para bodega se
// ingresan cantidades altas: "cincuenta", "cien", "doscientos cincuenta"...).
const NUMEROS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
  mil: 1000, docena: 12, docenas: 12,
};

const esNumero = (w: string) => /^\d+$/.test(w) || w in NUMEROS;
const valorNumero = (w: string) => (/^\d+$/.test(w) ? parseInt(w, 10) : NUMEROS[w]);

/** Compone un número a partir de sus palabras: "doscientos cincuenta y tres" → 253. */
function componerNumero(run: string[]): number {
  let total = 0, actual = 0;
  for (const w of run) {
    if (w === "mil") { actual = (actual === 0 ? 1 : actual) * 1000; total += actual; actual = 0; }
    else if (w === "docena" || w === "docenas") { actual = (actual === 0 ? 1 : actual) * 12; }
    else actual += valorNumero(w);
  }
  return total + actual;
}

// Palabras que indican RESTAR.
const RESTAR = ["quita", "quitar", "quitame", "saca", "sacar", "sacame", "resta", "restar", "menos", "elimina", "eliminar", "borra", "borrar", "remueve", "remover"];

// Conectores que separan una orden de otra ("tres trufas Y dos paletas").
const SEPARADORES = new Set(["y", "mas", "ademas", "tambien", "luego", "despues"]);

// Palabras a ignorar al comparar nombres de producto (verbos de acción, conectores…).
const RELLENO = new Set([
  "de", "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "con", "por", "favor", "mas", "otra", "otro",
  "agrega", "agregar", "agregame", "suma", "sumar", "sumame", "pon", "poner", "ponme",
  "carga", "cargar", "cargame", "carguen", "sube", "subir", "lleva", "llevar",
  "llego", "llegaron", "llega", "llegan", "recibi", "recibe", "recibio", "recibimos",
  "ingresa", "ingresar", "ingreso", "entra", "entraron", "deja", "deje", "dejamos", "repon", "reponer",
]);

/** Reemplaza en `tokens` la primera aparición de la subsecuencia `seq` por `[alias]` (todas las veces). */
function pegarSubsecuencia(tokens: string[], seq: string[], alias: string): string[] {
  if (seq.length === 0) return tokens;
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    if (tokens.slice(i, i + seq.length).join(" ") === seq.join(" ")) { out.push(alias); i += seq.length; }
    else { out.push(tokens[i]); i++; }
  }
  return out;
}

/** Une las palabras-número contiguas (incluida la "y" interna) en un solo token con dígitos. */
function compactarNumeros(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    if (!esNumero(tokens[i])) { out.push(tokens[i]); i++; continue; }
    const run: string[] = [];
    while (i < tokens.length) {
      if (esNumero(tokens[i])) { run.push(tokens[i]); i++; }
      else if (tokens[i] === "y" && i + 1 < tokens.length && esNumero(tokens[i + 1])) { i++; } // "cincuenta y tres" = 53
      else break;
    }
    out.push(String(componerNumero(run)));
  }
  return out;
}

/** Interpreta una frase completa y devuelve los cambios al carrito/stock. */
export function interpretarComandoVenta(texto: string, productos: ProdVoz[]): CambioVoz[] {
  // Productos: tokens para comparar. Los que llevan un conector adentro (ej. "tú y yo")
  // reciben un alias pegado para no romperse al separar por "y".
  const prods = productos.map((p) => {
    const raw = norm(p.nombre).split(" ").filter(Boolean);
    const tieneSep = raw.some((w) => SEPARADORES.has(w));
    const alias = tieneSep ? raw.join("") : null; // "tu y yo" → "tuyyo"
    const tokens = raw.filter((w) => !RELLENO.has(w));
    return { ...p, raw, alias, tokens: alias ? [...tokens, alias] : tokens };
  });

  let tokens = norm(texto).split(" ").filter(Boolean);

  // "media docena" = 6 (antes de compactar, para que "docena" no cuente como 12 suelto).
  tokens = pegarSubsecuencia(tokens, ["media", "docena"], "6");

  // Pega los nombres con conector interno ("tú y yo") para que no se partan por la "y".
  for (const p of prods) if (p.alias) tokens = pegarSubsecuencia(tokens, p.raw, p.alias);

  // Convierte las palabras-número en dígitos (elimina la "y" interna de los números).
  tokens = compactarNumeros(tokens);

  // Ahora sí, separa en órdenes por los conectores que quedaron (ya no hay "y" de números/nombres).
  const segmentos = tokens.join(" ").split(/\s+(?:y|mas|ademas|tambien|luego|despues)\s+|,/).map((s) => s.trim()).filter(Boolean);

  const acumulado = new Map<string, CambioVoz>();

  for (const seg of segmentos) {
    const palabras = seg.split(" ").filter(Boolean);
    const restar = palabras.some((w) => RESTAR.includes(w));

    // Cantidad = primer token numérico (ya compactado a dígitos).
    let cantidad: number | null = null;
    for (const w of palabras) {
      if (/^\d+$/.test(w)) { cantidad = parseInt(w, 10); break; }
      if (w in NUMEROS) { cantidad = NUMEROS[w]; break; }
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
