import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lineaLabel } from "@/lib/dominio/produccion";
import { SECCIONES_CATALOGO, seccionCatalogoLabel, seccionCatalogoIcono, seccionCatalogoColor } from "@/lib/dominio/catalogo";

export const dynamic = "force-dynamic";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ linea?: string; formato?: string; seccion?: string }>;
}) {
  const { linea, formato, seccion } = await searchParams;

  const productos = await prisma.producto.findMany({ orderBy: [{ linea: "asc" }, { nombre: "asc" }] });

  const lineas = [...new Set(productos.map((p) => p.linea))].sort();
  const formatos = [...new Set(productos.filter((p) => (linea ? p.linea === linea : true)).map((p) => p.formato).filter(Boolean) as string[])].sort();

  const filtrados = productos.filter(
    (p) =>
      (linea ? p.linea === linea : true) &&
      (formato ? p.formato === formato : true) &&
      (seccion ? (p.seccion ?? "propio") === seccion : true),
  );
  const hayFiltro = Boolean(linea || formato);

  // Agrupa por sección para mostrar cada catálogo aparte.
  const seccionesMostrar = seccion ? [seccion] : [...SECCIONES_CATALOGO];
  const porSeccion = (s: string) => filtrados.filter((p) => (p.seccion ?? "propio") === s);
  const conteo = (s: string) => productos.filter((p) => (p.seccion ?? "propio") === s).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Catálogo</h1>
          <p className="text-sm text-slate-500">Separado por sección. Precios en <Link href="/admin/precios" className="font-semibold text-[#1479c4]">Precios</Link>.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/productos/imagenes" className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 active:scale-95">📷 Fotos tienda</Link>
          <a href="/tienda" target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 active:scale-95">🛒 Ver tienda</a>
          <Link href="/admin/productos/nuevo" className="rounded-full bg-[#1479c4] px-6 py-3 text-base font-extrabold text-white shadow-sm transition hover:brightness-110 active:scale-95">+ Nuevo producto</Link>
        </div>
      </div>

      {/* Chips de sección (catálogos) */}
      <div className="mt-4 flex flex-wrap gap-2">
        <SeccionChip href={buildHref({ linea, formato })} activo={!seccion} label="Todas" icono="📚" color="#334155" n={productos.length} />
        {SECCIONES_CATALOGO.map((s) => (
          <SeccionChip
            key={s}
            href={buildHref({ linea, formato, seccion: s })}
            activo={seccion === s}
            label={seccionCatalogoLabel[s]}
            icono={seccionCatalogoIcono[s]}
            color={seccionCatalogoColor[s]}
            n={conteo(s)}
          />
        ))}
      </div>

      {/* Filtro por tipo y formato */}
      <form action="/admin/productos" className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {seccion && <input type="hidden" name="seccion" value={seccion} />}
        <label className="text-xs font-bold text-slate-600">Tipo de producto
          <select name="linea" defaultValue={linea ?? ""} className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">— todos —</option>
            {lineas.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">Formato
          <select name="formato" defaultValue={formato ?? ""} className="mt-1 block w-44 rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">— todos —</option>
            {formatos.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition active:scale-95">Filtrar</button>
        {hayFiltro && <Link href={seccion ? `/admin/productos?seccion=${seccion}` : "/admin/productos"} className="text-xs font-semibold text-slate-500">limpiar</Link>}
      </form>

      {/* Secciones */}
      {seccionesMostrar.map((s) => {
        const lista = porSeccion(s);
        if (lista.length === 0) return null;
        const color = seccionCatalogoColor[s] ?? "#334155";
        return (
          <section key={s} className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ backgroundColor: `${color}18` }}>{seccionCatalogoIcono[s]}</span>
              <h2 className="text-lg font-extrabold" style={{ color }}>{seccionCatalogoLabel[s]}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{lista.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((p) => (
                <div key={p.id} className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{p.nombre}</p>
                    {!p.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactivo</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {lineaLabel[p.linea] ?? p.linea}{p.formato ? ` · ${p.formato}` : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/admin/productos/${p.id}`} className="flex-1 rounded-lg bg-slate-100 py-2.5 text-center text-sm font-bold text-slate-700 transition active:scale-95 hover:bg-slate-200">✎ Editar</Link>
                    {p.fotoUrl ? (
                      <a href={p.fotoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg py-2.5 text-center text-sm font-bold text-white transition active:scale-95 hover:brightness-110" style={{ backgroundColor: color }}>👁️ Ver</a>
                    ) : (
                      <span className="flex-1 rounded-lg bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-300">sin foto</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {filtrados.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {productos.length === 0 ? "Aún no hay productos. Crea el primero." : "Sin productos para esta selección."}
        </p>
      )}
    </div>
  );
}

function buildHref(q: { linea?: string; formato?: string; seccion?: string }) {
  const p = new URLSearchParams();
  if (q.seccion) p.set("seccion", q.seccion);
  if (q.linea) p.set("linea", q.linea);
  if (q.formato) p.set("formato", q.formato);
  const s = p.toString();
  return `/admin/productos${s ? `?${s}` : ""}`;
}

function SeccionChip({ href, activo, label, icono, color, n }: { href: string; activo: boolean; label: string; icono: string; color: string; n: number }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition active:scale-95 ${activo ? "text-white shadow-sm" : "bg-white text-slate-600 hover:border-slate-300"}`}
      style={activo ? { backgroundColor: color, borderColor: color } : { borderColor: "#e2e8f0" }}
    >
      <span>{icono}</span> {label}
      <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{n}</span>
    </Link>
  );
}
