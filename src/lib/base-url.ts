import { headers } from "next/headers";

/**
 * URL base pública de la app (https://benechito.com o lo que haya). Usa APP_URL si
 * está definida; si no, la deduce de los headers de la request. Sirve para construir
 * links absolutos que se mandan por WhatsApp (preventa, portal, etc.).
 */
export async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}
