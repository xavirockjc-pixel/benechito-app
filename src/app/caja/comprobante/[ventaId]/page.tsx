import ComprobanteVenta from "@/app/_shared/ComprobanteVenta";

export const dynamic = "force-dynamic";

export default async function ComprobanteCajaPage({ params, searchParams }: {
  params: Promise<{ ventaId: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { ventaId } = await params;
  const { volver } = await searchParams;
  const destino = volver && volver.startsWith("/") ? volver : "/caja";
  return <ComprobanteVenta ventaId={ventaId} volver={destino} volverLabel="🛒 Nueva venta" />;
}
