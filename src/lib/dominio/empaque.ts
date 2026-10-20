// Empaque: mostrar el stock por packs/bolsas y el total de unidades.
// Postres van en pack de 16; paletas y tú y yo en bolsa de 50.

export type PackInfo = { unidades: number; packs: number; resto: number; porPack: number };

/** Descompone una cantidad de unidades en packs + resto, según el tamaño de pack. */
export function packInfo(unidades: number, porPack?: number | null): PackInfo {
  const u = Math.max(0, Math.floor(unidades || 0));
  const p = porPack && porPack > 0 ? Math.floor(porPack) : 0;
  if (!p) return { unidades: u, packs: 0, resto: u, porPack: 0 };
  return { unidades: u, packs: Math.floor(u / p), resto: u % p, porPack: p };
}

/** Palabra del empaque: pack (postres, 16) o bolsa (paletas / tú y yo, 50). */
export function palabraPack(porPack: number): string {
  return porPack === 16 ? "pack" : "bolsa";
}
