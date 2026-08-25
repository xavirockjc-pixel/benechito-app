-- CreateTable
CREATE TABLE "Medida" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "litros" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medida_pkey" PRIMARY KEY ("id")
);
