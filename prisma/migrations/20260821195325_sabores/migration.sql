-- CreateTable
CREATE TABLE "Sabor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "linea" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSabor" (
    "id" TEXT NOT NULL,
    "saborId" TEXT NOT NULL,
    "ubicacionId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockSabor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sabor_linea_idx" ON "Sabor"("linea");

-- CreateIndex
CREATE INDEX "StockSabor_ubicacionId_idx" ON "StockSabor"("ubicacionId");

-- CreateIndex
CREATE UNIQUE INDEX "StockSabor_saborId_ubicacionId_key" ON "StockSabor"("saborId", "ubicacionId");

-- AddForeignKey
ALTER TABLE "StockSabor" ADD CONSTRAINT "StockSabor_saborId_fkey" FOREIGN KEY ("saborId") REFERENCES "Sabor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSabor" ADD CONSTRAINT "StockSabor_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
