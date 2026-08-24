import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/retiros/entrante
 * Buzón automático de pedidos de retiro. Tu n8n (conectado a WhatsApp/Evolution,
 * Facebook e Instagram) llama a esta URL cuando entra un mensaje de un cliente, y
 * el pedido cae SOLO en la central (/admin/retiros), listo para despachar.
 *
 * Seguridad: requiere el token RETIROS_WEBHOOK_TOKEN en el header
 *   x-webhook-token: <token>   (o Authorization: Bearer <token>)
 *
 * Cuerpo (JSON), campos flexibles:
 *   canal     "whatsapp" | "facebook" | "instagram"   (por defecto whatsapp)
 *   telefono  número del cliente (para calzar con la base y para responderle)
 *   nombre    nombre del cliente (si no está en la base)
 *   mensaje   texto del pedido
 *   destino   opcional: "local" | "bodega" | "reparto" (si ya quieres pre-despacharlo)
 */

const CANALES = ["whatsapp", "facebook", "instagram"];
const DESTINOS = ["local", "bodega", "reparto"];

/** Últimos 8 dígitos de un teléfono, para calzar clientes sin depender del prefijo. */
function colaTelefono(v: string): string {
  const d = (v || "").replace(/\D/g, "");
  return d.slice(-8);
}

export async function POST(req: Request) {
  try {
    // --- Autenticación del webhook ---
    const token = process.env.RETIROS_WEBHOOK_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Webhook sin configurar (falta RETIROS_WEBHOOK_TOKEN)" }, { status: 503 });
    }
    const auth = req.headers.get("authorization") ?? "";
    const enviado = req.headers.get("x-webhook-token") ?? auth.replace(/^Bearer\s+/i, "");
    if (enviado !== token) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Campos flexibles (acepta varios nombres típicos que manda n8n/Evolution).
    const canalRaw = String(body.canal ?? body.channel ?? "whatsapp").toLowerCase();
    const canal = CANALES.includes(canalRaw) ? canalRaw : "whatsapp";
    const telefono = String(body.telefono ?? body.phone ?? body.from ?? body.numero ?? "").trim();
    const nombre = String(body.nombre ?? body.name ?? body.pushName ?? "").trim();
    const mensaje = String(body.mensaje ?? body.message ?? body.texto ?? body.text ?? "").trim();
    const destinoRaw = String(body.destino ?? "").toLowerCase();
    const destino = DESTINOS.includes(destinoRaw) ? destinoRaw : "central";

    if (!mensaje && !telefono && !nombre) {
      return NextResponse.json({ ok: false, error: "Mensaje vacío" }, { status: 400 });
    }

    // --- Calce automático con un cliente de la base por teléfono ---
    let negocioId: string | null = null;
    let tituloCliente = nombre || telefono || "Cliente";
    const cola = colaTelefono(telefono);
    if (cola.length >= 6) {
      const candidatos = await prisma.negocio.findMany({
        where: { whatsapp: { contains: cola } },
        select: { id: true, nombreNegocio: true },
        take: 1,
      });
      if (candidatos[0]) {
        negocioId = candidatos[0].id;
        tituloCliente = candidatos[0].nombreNegocio;
      }
    }

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    const retiro = await prisma.agenda.create({
      data: {
        titulo: `🧾 Retiro · ${tituloCliente}`,
        fecha: hoy,
        tipo: "retiro",
        estado: "pendiente",
        negocioId,
        contacto: negocioId ? null : [nombre, telefono].filter(Boolean).join(" · ") || null,
        canal,
        destino,
        notas: mensaje || null,
      },
    });

    // Si calzó con un cliente, deja la huella en su ficha.
    if (negocioId) {
      await prisma.actividad.create({
        data: { negocioId, tipo: "contacto", descripcion: `Pedido de retiro por ${canal}${mensaje ? ": " + mensaje : ""}` },
      });
    }

    // Refresca la central y los departamentos al instante.
    ["/admin/retiros", "/caja", "/bodega", "/vendedor/agenda"].forEach((r) => revalidatePath(r));

    return NextResponse.json({ ok: true, id: retiro.id, calzado: Boolean(negocioId), destino }, { status: 201 });
  } catch (err) {
    console.error("Error en retiro entrante:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
