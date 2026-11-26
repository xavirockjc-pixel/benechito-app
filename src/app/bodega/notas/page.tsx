import NotasPersonales from "@/app/_shared/NotasPersonales";

export const dynamic = "force-dynamic";

export default async function NotasBodega({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const sp = await searchParams;
  return <NotasPersonales area="bodega" basePath="/bodega/notas" volverHref="/bodega" volverLabel="Bodega" acento="#b45309" sp={sp} />;
}
