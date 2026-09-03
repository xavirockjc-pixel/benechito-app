/**
 * Portal del Cliente: relación entre el tipo de cliente y la "tarifa" de la tienda
 * (el precio con el que pide). Los códigos de tarifa coinciden con TARIFAS_TIENDA.
 */
export function tarifaDeCliente(tipoCliente: string | null | undefined): { codigo: string; label: string } {
  switch (tipoCliente) {
    case "distribuidor":
      return { codigo: "distribuidor", label: "Precio distribuidor" };
    case "mayorista":
    case "revendedor":
    case "negocio_retiro":
    case "ruta":
      return { codigo: "comerciante", label: "Precio mayorista" };
    default:
      return { codigo: "detalle", label: "Precio detalle" };
  }
}
