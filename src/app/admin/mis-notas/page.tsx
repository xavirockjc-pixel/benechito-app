import NotasPersonales from "@/app/_shared/NotasPersonales";

export const dynamic = "force-dynamic";

export default async function MisNotasJefatura({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const sp = await searchParams;
  return <NotasPersonales area="jefatura" basePath="/admin/mis-notas" volverHref="/admin" volverLabel="Panel" acento="#7c3aed" titulo="📔 Mis notas (jefatura)" sp={sp} />;
}
