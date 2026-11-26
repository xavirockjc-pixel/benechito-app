import NotasPersonales from "@/app/_shared/NotasPersonales";

export const dynamic = "force-dynamic";

export default async function NotasCaja({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const sp = await searchParams;
  return <NotasPersonales area="caja" basePath="/caja/notas" volverHref="/caja" volverLabel="Caja" acento="#0f7a44" sp={sp} />;
}
