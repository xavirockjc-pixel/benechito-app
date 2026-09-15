-- Inicio del período/día actual (para "Empezar nuevo día": oculta lo anterior sin borrarlo).
ALTER TABLE "Empresa" ADD COLUMN "periodoDesde" TIMESTAMP(3);
