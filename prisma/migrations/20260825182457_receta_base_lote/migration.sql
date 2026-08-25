-- CreateTable
CREATE TABLE "RecetaBase" (
    "id" TEXT NOT NULL,
    "linea" TEXT NOT NULL,
    "baseRef" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baseUnidad" TEXT NOT NULL DEFAULT 'l',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecetaBase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecetaBase_linea_key" ON "RecetaBase"("linea");
