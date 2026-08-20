import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/prospectos
 * Recibe el formulario de la landing y crea un Negocio en estado "nuevo".
 * Deja preparado un webhook opcional a n8n (Fase 2) sin bloquear la respuesta.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validación mínima de campos obligatorios
    const requeridos = ["nombre", "negocio", "whatsapp", "comuna"];
    for (const campo of requeridos) {
      if (!body[campo] || String(body[campo]).trim() === "") {
        return NextResponse.json(
          { ok: false, error: `Falta el campo: ${campo}` },
          { status: 400 }
        );
      }
    }

    const negocio = await prisma.negocio.create({
      data: {
        nombreContacto: String(body.nombre).trim(),
        nombreNegocio: String(body.negocio).trim(),
        whatsapp: String(body.whatsapp).trim(),
        comuna: String(body.comuna).trim(),
        tipoNegocio: body.tipoNegocio ? String(body.tipoNegocio) : null,
        interesPunto: body.interesPunto ? String(body.interesPunto) : null,
        interesHelados: body.interesHelados === "si" || body.interesHelados === true,
        observaciones: body.observaciones ? String(body.observaciones) : null,
        estado: "nuevo",
        origen: "landing",
        actividades: {
          create: {
            tipo: "creado",
            descripcion: "Prospecto ingresado desde la landing",
          },
        },
      },
    });

    // --- Gancho para automatización (n8n / WhatsApp) — Fase 2 ---
    // Si defines N8N_WEBHOOK_URL, se notifica el nuevo lead sin bloquear.
    const webhook = process.env.N8N_WEBHOOK_URL;
    if (webhook) {
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento: "nuevo_prospecto", negocio }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: negocio.id }, { status: 201 });
  } catch (err) {
    console.error("Error creando prospecto:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
