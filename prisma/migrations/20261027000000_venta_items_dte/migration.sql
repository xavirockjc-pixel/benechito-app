-- Detalle de líneas por venta (para el DTE y el comprobante)
CREATE TABLE "VentaItem" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "VentaItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");

ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Campos DTE en DocumentoVenta
ALTER TABLE "DocumentoVenta" ADD COLUMN "urlXml" TEXT;
ALTER TABLE "DocumentoVenta" ADD COLUMN "trackId" TEXT;
ALTER TABLE "DocumentoVenta" ADD COLUMN "mensajeError" TEXT;
