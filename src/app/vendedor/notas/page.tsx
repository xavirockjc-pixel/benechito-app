import NotasPersonales from "@/app/_shared/NotasPersonales";

export const dynamic = "force-dynamic";

export default async function NotasVendedor({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const sp = await searchParams;
  return <NotasPersonales area="vendedor" basePath="/vendedor/notas" volverHref="/vendedor" volverLabel="Vendedor" acento="#1479c4" sp={sp} />;
}
