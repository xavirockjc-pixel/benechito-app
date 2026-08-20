-- CreateTable
CREATE TABLE "Negocio" (
    "id" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "nombreNegocio" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "ciudad" TEXT,
    "tipoNegocio" TEXT,
    "direccion" TEXT,
    "interesPunto" TEXT,
    "interesHelados" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'nuevo',
    "origen" TEXT NOT NULL DEFAULT 'landing',
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaInstalacion" TIMESTAMP(3),
    "ultimaReposicion" TIMESTAMP(3),
    "proximaReposicion" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "linea" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "base" TEXT,
    "formato" TEXT,
    "sku" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoProducto" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadInstalada" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PuntoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reposicion" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "Reposicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReposicionItem" (
    "id" TEXT NOT NULL,
    "reposicionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReposicionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'equipo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Negocio_estado_idx" ON "Negocio"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "PuntoProducto_negocioId_productoId_key" ON "PuntoProducto"("negocioId", "productoId");

-- CreateIndex
CREATE INDEX "Actividad_negocioId_idx" ON "Actividad"("negocioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "PuntoProducto" ADD CONSTRAINT "PuntoProducto_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuntoProducto" ADD CONSTRAINT "PuntoProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reposicion" ADD CONSTRAINT "Reposicion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReposicionItem" ADD CONSTRAINT "ReposicionItem_reposicionId_fkey" FOREIGN KEY ("reposicionId") REFERENCES "Reposicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReposicionItem" ADD CONSTRAINT "ReposicionItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
