-- CreateTable
CREATE TABLE "TarifaTrato" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "valorUnit" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarifaTrato_pkey" PRIMARY KEY ("id")
);

