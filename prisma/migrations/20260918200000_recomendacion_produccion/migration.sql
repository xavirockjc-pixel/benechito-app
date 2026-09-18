-- Recomendaciones de la central para la app de Producción (notas/sugerencias por línea).
CREATE TABLE "RecomendacionProduccion" (
    "id" TEXT NOT NULL,
    "linea" TEXT,
    "texto" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "autor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecomendacionProduccion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecomendacionProduccion_linea_idx" ON "RecomendacionProduccion"("linea");
CREATE INDEX "RecomendacionProduccion_activo_idx" ON "RecomendacionProduccion"("activo");
