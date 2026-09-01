import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { motivoDuplicado, type NegocioCmp } from "@/lib/dominio/duplicados";

export const dynamic = "force-dynamic";

export default async function DuplicadosPage() {
  const negocios = (await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, rut: true, comuna: true, latitud: true, longitud: true },
    take: 2000,
  })) as NegocioCmp[];

  // Union-find para agrupar negocios que se parecen entre sí.
  const parent = new Map<string, string>();
  negocios.forEach((n) => parent.set(n.id, n.id));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== r) { const p = parent.get(c)!; parent.set(c, r); c = p; }
    return r;
  };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

  const motivos = new Map<string, Set<string>>();
  for (let i = 0; i < negocios.length; i++) {
    for (let j = i + 1; j < negocios.length; j++) {
      const a = negocios[i], b = negocios[j];
      const m = motivoDuplicado({ nombre: a.nombreNegocio, rut: a.rut ?? undefined, whatsapp: a.whatsapp ?? undefined, latitud: a.latitud, longitud: a.longitud }, b);
      if (m) {
        union(a.id, b.id);
        const key = find(a.id);
        if (!motivos.has(key)) motivos.set(key, new Set());
        motivos.get(key)!.add(m);
      }
    }
  }

  const grupos = new Map<string, NegocioCmp[]>();
  negocios.forEach((n) => {
    const r = find(n.id);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r)!.push(n);
  });
  const dups = [...grupos.entries()].filter(([, arr]) => arr.length > 1);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/negocios" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">🔁 Posibles duplicados</h1>
      <p className="text-sm text-slate-500">Clientes que parecen ser el mismo negocio (mismo RUT, teléfono, nombre o ubicación). Revísalos y quédate con uno.</p>

      {dups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No se detectaron clientes duplicados.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {dups.map(([key, arr]) => (
            <div key={key} className="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap gap-1">
                {[...(motivos.get(key) ?? new Set(["parecidos"]))].map((m) => (
                  <span key={m} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{m}</span>
                ))}
                <span className="ml-auto text-xs font-bold text-slate-400">{arr.length} clientes</span>
              </div>
              <div className="divide-y divide-slate-100">
                {arr.map((n) => (
                  <Link key={n.id} href={`/admin/negocios/${n.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-800">{n.nombreNegocio}</span>
                      <span className="block text-xs text-slate-500">
                        {n.nombreContacto ? `${n.nombreContacto} · ` : ""}{n.whatsapp || "sin tel"}{n.rut ? ` · RUT ${n.rut}` : ""}{n.comuna ? ` · ${n.comuna}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#1479c4]">Abrir →</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
