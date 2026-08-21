-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendedorId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'planificada',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParadaRuta" (
    "id" TEXT NOT NULL,
    "rutaId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,

    CONSTRAINT "ParadaRuta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ruta_vendedorId_idx" ON "Ruta"("vendedorId");

-- CreateIndex
CREATE INDEX "Ruta_estado_idx" ON "Ruta"("estado");

-- CreateIndex
CREATE INDEX "ParadaRuta_rutaId_idx" ON "ParadaRuta"("rutaId");

-- CreateIndex
CREATE UNIQUE INDEX "ParadaRuta_rutaId_negocioId_key" ON "ParadaRuta"("rutaId", "negocioId");

-- AddForeignKey
ALTER TABLE "Ruta" ADD CONSTRAINT "Ruta_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaRuta" ADD CONSTRAINT "ParadaRuta_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaRuta" ADD CONSTRAINT "ParadaRuta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
