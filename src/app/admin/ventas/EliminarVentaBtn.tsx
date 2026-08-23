"use client";

import { eliminarVenta } from "./actions";

/** Botón para eliminar/deshacer una venta desde la lista, con confirmación. */
export default function EliminarVentaBtn({ ventaId }: { ventaId: string }) {
  return (
    <form
      action={eliminarVenta}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar esta venta y reponer su stock? No se puede deshacer.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="ventaId" value={ventaId} />
      <input type="hidden" name="volver" value="lista" />
      <button className="text-xs font-semibold text-red-500 hover:text-red-700">Eliminar</button>
    </form>
  );
}
