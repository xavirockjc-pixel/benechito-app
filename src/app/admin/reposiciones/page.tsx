import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function ReposicionesPage() {
  const ahora = new Date();

  // Puntos que requieren reposición: activos/en reposición con fecha vencida o sin fecha
  const activos = await prisma.negocio.findMany({
    where: { estado: { in: ["punto_activo", "reposicion"] } },
    orderBy: [{ proximaReposicion: "asc" }],
  });

  const pendientes = activos.filter(
    (n) => !n.proximaReposicion || n.proximaReposicion <= ahora
  );
  const programadas = activos.filter(
    (n) => n.proximaReposicion && n.proximaReposicion > ahora
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy">Reposiciones</h1>
      <p className="text-sm text-choco-2">
        Puntos activos que necesitan reposición y próximas visitas programadas.
      </p>

      <Bloque
        titulo="Pendientes"
        vacio="No hay reposiciones pendientes 🎉"
        color="#0e7490"
        negocios={pendientes}
        fmt={fmt}
        etiqueta={(n) => (!n.proximaReposicion ? "Sin fecha" : `Vencía ${fmt(n.proximaReposicion)}`)}
      />

      <Bloque
        titulo="Programadas"
        vacio="No hay reposiciones programadas."
        color="#2f7d34"
        negocios={programadas}
        fmt={fmt}
        etiqueta={(n) => `Próxima ${fmt(n.proximaReposicion)}`}
      />
    </div>
  );
}

type N = { id: string; nombreNegocio: string; nombreContacto: string; comuna: string; ultimaReposicion: Date | null; proximaReposicion: Date | null };

function Bloque({
  titulo,
  vacio,
  color,
  negocios,
  fmt,
  etiqueta,
}: {
  titulo: string;
  vacio: string;
  color: string;
  negocios: N[];
  fmt: (d: Date | null) => string;
  etiqueta: (n: N) => string;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {titulo} <span className="text-sm font-normal text-choco-2">({negocios.length})</span>
      </h2>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-crema-2">
        {negocios.length === 0 && <p className="p-4 text-sm text-choco-2">{vacio}</p>}
        {negocios.map((n) => (
          <Link
            key={n.id}
            href={`/admin/negocios/${n.id}`}
            className="flex items-center justify-between border-b border-crema-2 px-4 py-3 last:border-0 hover:bg-crema/40"
          >
            <div>
              <p className="font-semibold text-navy">{n.nombreNegocio}</p>
              <p className="text-xs text-choco-2">
                {n.comuna} · última: {fmt(n.ultimaReposicion)}
              </p>
            </div>
            <span className="text-xs font-bold" style={{ color }}>
              {etiqueta(n)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
