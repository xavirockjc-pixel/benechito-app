import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rubroActivo } from "@/lib/dominio/empresa";

export const dynamic = "force-dynamic";

/**
 * Primeros pasos: guía de arranque para dejar el sistema andando. Detecta solo qué
 * falta (equipo, catálogo, precios, stock, primera venta) y lleva a cada pantalla.
 * El objetivo es que un negocio nuevo "prenda" sin perderse entre los módulos.
 */
export default async function PrimerosPasos() {
  const [nTrabajadores, nProductos, nPrecios, nStock, nVentas, rubro] = await Promise.all([
    prisma.trabajador.count(),
    prisma.producto.count({ where: { activo: true } }),
    prisma.precioProducto.count(),
    prisma.stock.count({ where: { cantidad: { gt: 0 } } }),
    prisma.venta.count(),
    rubroActivo(),
  ]);

  const pasos = [
    {
      n: 1, icon: "👥", titulo: "Arma tu equipo",
      desc: "Registra a las personas que trabajan contigo y dales su acceso (cada una con su clave).",
      href: "/admin/equipo", cta: "Ir a Equipo", listo: nTrabajadores > 0,
    },
    {
      n: 2, icon: "🍫", titulo: "Carga tu catálogo",
      desc: "Agrega tus productos con foto. Lo que vendes en cada canal (local, reparto, tienda).",
      href: "/admin/productos", cta: "Ir a Catálogo", listo: nProductos > 0,
    },
    {
      n: 3, icon: "🏷️", titulo: "Pon los precios",
      desc: "Define el precio de cada producto por perfil (unitario, mayorista, reparto, tienda…).",
      href: "/admin/precios", cta: "Ir a Precios", listo: nPrecios > 0,
    },
    {
      n: 4, icon: "📦", titulo: "Carga el stock inicial",
      desc: "Cuenta lo que tienes hoy y ponlo en el inventario. Después se descuenta solo al vender.",
      href: "/admin/inventario", cta: "Ir a Inventario", listo: nStock > 0,
    },
    {
      n: 5, icon: "🛒", titulo: "Haz tu primera venta",
      desc: "Prueba el punto de venta. Con esto el panel empieza a mostrar tus números reales.",
      href: "/admin/pos", cta: "Ir a Vender", listo: nVentas > 0,
    },
  ];

  const listos = pasos.filter((p) => p.listo).length;
  const total = pasos.length;
  const pct = Math.round((listos / total) * 100);
  const todoListo = listos === total;
  const siguiente = pasos.find((p) => !p.listo);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 text-3xl">🚀</div>
      <h1 className="mt-1 text-2xl font-extrabold text-navy">Primeros pasos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Deja tu {rubro.nombre.toLowerCase()} andando en 5 pasos. Puedes hacerlos en orden; el sistema marca solo lo que ya está listo.
      </p>

      {/* Progreso */}
      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">{listos} de {total} listos</span>
          <span className="text-sm font-extrabold text-naranja">{pct}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-naranja transition-all" style={{ width: `${pct}%` }} />
        </div>
        {!todoListo && siguiente && (
          <p className="mt-3 text-sm text-slate-600">
            👉 Sigue con el paso {siguiente.n}: <span className="font-bold text-navy">{siguiente.titulo}</span>.
          </p>
        )}
        {todoListo && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700 ring-1 ring-green-200">
            🎉 ¡Todo listo! Tu sistema ya está operando. Ahora solo vende y revisa el Panel.
          </p>
        )}
      </div>

      {/* Pasos */}
      <ol className="mt-4 space-y-3">
        {pasos.map((p) => (
          <li key={p.n} className={`rounded-2xl border p-4 shadow-sm transition ${p.listo ? "border-green-200 bg-green-50/40" : "border-crema-2 bg-white"}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${p.listo ? "bg-green-100" : "bg-crema"}`}>
                {p.listo ? "✅" : p.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Paso {p.n}</span>
                  {p.listo
                    ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">Listo</span>
                    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">Pendiente</span>}
                </div>
                <h2 className="mt-0.5 text-lg font-extrabold text-navy">{p.titulo}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{p.desc}</p>
                <Link href={p.href} className={`mt-3 inline-block rounded-full px-5 py-2 text-sm font-bold text-white shadow-sm transition ${p.listo ? "bg-slate-400 hover:bg-slate-500" : "bg-naranja hover:bg-naranja-2"}`}>
                  {p.listo ? `Revisar · ${p.cta.replace("Ir a ", "")}` : p.cta} →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        💡 ¿El sistema se desordenó por pruebas? Puedes dejar los números en cero sin perder tu configuración
        (catálogo, precios, equipo) desde <Link href="/admin/reiniciar" className="font-semibold text-[#1479c4]">Sistema → Reiniciar números</Link>.
      </p>
    </div>
  );
}
