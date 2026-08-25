-- CreateTable
CREATE TABLE "Tipo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "seccion" TEXT NOT NULL DEFAULT 'helado',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formato" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "linea" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_codigo_key" ON "Tipo"("codigo");

-- CreateIndex
CREATE INDEX "Tipo_seccion_idx" ON "Tipo"("seccion");

-- CreateIndex
CREATE INDEX "Formato_linea_idx" ON "Formato"("linea");
