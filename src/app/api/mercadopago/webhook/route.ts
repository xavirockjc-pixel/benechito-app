import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPago } from "@/lib/mercadopago";

/**
 * POST /api/mercadopago/webhook
 * Notificación de Mercado Pago. Cuando un pago queda "approved", marca el pedido
 * como pagado y confirmado. La referencia del pedido va en external_reference.
 * Configura esta URL como notification_url en Mercado Pago (o ya va en la preferencia).
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    // MP manda el id del pago de varias formas según la versión.
    const tipo = String((body as { type?: string }).type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
    const dataId =
      (body as { data?: { id?: string | number } }).data?.id ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id");

    if (!dataId || (tipo && tipo !== "payment")) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const pago = await getPago(String(dataId));
    if (!pago || !pago.externalReference) return NextResponse.json({ ok: true });

    if (pago.status === "approved") {
      await prisma.pedido.update({
        where: { id: pago.externalReference },
        data: { pagado: true, estado: "confirmado", pagoRef: String(dataId) },
      }).catch(() => {});
      ["/admin/retiros", "/admin/pedidos", "/caja"].forEach((r) => revalidatePath(r));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error webhook Mercado Pago:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// MP a veces hace GET para validar la URL.
export async function GET() {
  return NextResponse.json({ ok: true });
}
