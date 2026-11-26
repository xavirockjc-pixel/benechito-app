import NotasPersonales from "@/app/_shared/NotasPersonales";

export const dynamic = "force-dynamic";

export default async function NotasProduccion({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const sp = await searchParams;
  return <NotasPersonales area="produccion" basePath="/produccion/notas" volverHref="/produccion" volverLabel="Producción" acento="#0d9488" sp={sp} />;
}
