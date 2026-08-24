-- CreateTable
CREATE TABLE "MateriaPrima" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'insumo',
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costo" DECIMAL(12,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MateriaPrima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoMateria" (
    "id" TEXT NOT NULL,
    "materiaPrimaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT,
    "referencia" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoMateria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaItem" (
    "id" TEXT NOT NULL,
    "productoId" TEXT,
    "saborId" TEXT,
    "materiaPrimaId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecetaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MateriaPrima_categoria_idx" ON "MateriaPrima"("categoria");

-- CreateIndex
CREATE INDEX "MovimientoMateria_materiaPrimaId_idx" ON "MovimientoMateria"("materiaPrimaId");

-- CreateIndex
CREATE INDEX "MovimientoMateria_fecha_idx" ON "MovimientoMateria"("fecha");

-- CreateIndex
CREATE INDEX "RecetaItem_productoId_idx" ON "RecetaItem"("productoId");

-- CreateIndex
CREATE INDEX "RecetaItem_saborId_idx" ON "RecetaItem"("saborId");

-- CreateIndex
CREATE INDEX "RecetaItem_materiaPrimaId_idx" ON "RecetaItem"("materiaPrimaId");

-- AddForeignKey
ALTER TABLE "MovimientoMateria" ADD CONSTRAINT "MovimientoMateria_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaItem" ADD CONSTRAINT "RecetaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaItem" ADD CONSTRAINT "RecetaItem_saborId_fkey" FOREIGN KEY ("saborId") REFERENCES "Sabor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetaItem" ADD CONSTRAINT "RecetaItem_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE CASCADE ON UPDATE CASCADE;
