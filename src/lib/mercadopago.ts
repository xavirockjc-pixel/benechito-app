// Integración Mercado Pago (Checkout Pro) por HTTP directo, sin SDK.
// Requiere en el servidor: MERCADOPAGO_ACCESS_TOKEN (lo carga el dueño, no se versiona).

const API = "https://api.mercadopago.com";

export function mpConfigurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

type ItemPref = { title: string; quantity: number; unit_price: number };

/**
 * Crea una preferencia de pago y devuelve el link de checkout (init_point).
 * Devuelve null si no está configurado o si falla (para caer al flujo sin pago).
 */
export async function crearPreferencia(opts: { pedidoId: string; items: ItemPref[]; baseUrl: string; nombre?: string; telefono?: string }): Promise<string | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/checkout/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: opts.items.map((it) => ({ ...it, currency_id: "CLP" })),
        external_reference: opts.pedidoId,
        back_urls: {
          success: `${opts.baseUrl}/tienda/gracias?pedido=${opts.pedidoId}`,
          pending: `${opts.baseUrl}/tienda/gracias?pedido=${opts.pedidoId}`,
          failure: `${opts.baseUrl}/tienda/gracias?pedido=${opts.pedidoId}&pago=fallo`,
        },
        auto_return: "approved",
        notification_url: `${opts.baseUrl}/api/mercadopago/webhook`,
        payer: opts.nombre ? { name: opts.nombre } : undefined,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { init_point?: string; sandbox_init_point?: string };
    return data.init_point ?? data.sandbox_init_point ?? null;
  } catch {
    return null;
  }
}

/** Consulta un pago por id. Devuelve estado y la referencia del pedido. */
export async function getPago(paymentId: string): Promise<{ status: string; externalReference: string | null } | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; external_reference?: string };
    return { status: data.status ?? "", externalReference: data.external_reference ?? null };
  } catch {
    return null;
  }
}
