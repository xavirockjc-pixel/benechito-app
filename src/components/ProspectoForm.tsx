"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/config";

const tiposNegocio = [
  "Almacén",
  "Minimarket",
  "Kiosco",
  "Botillería",
  "Panadería",
  "Cafetería",
  "Food truck",
  "Otro",
];

const nivelesInteres = [
  "Quiero instalarlo ya",
  "Muy interesado",
  "Estoy explorando",
];

type Estado = "idle" | "enviando" | "ok" | "error";

export default function ProspectoForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [nombre, setNombre] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setNombre(String(data.nombre ?? ""));

    try {
      const res = await fetch("/api/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("fallo");
      setEstado("ok");
      form.reset();
    } catch {
      setEstado("error");
    }
  }

  if (estado === "ok") {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-crema-2">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-verde text-3xl text-white">
          ✓
        </div>
        <h3 className="mt-4 text-2xl font-extrabold text-navy">
          ¡Gracias{nombre ? `, ${nombre}` : ""}! 🎉
        </h3>
        <p className="mt-2 text-choco-2">
          Recibimos tu interés en un Punto Benechito. Te contactaremos muy
          pronto. Si quieres, escríbenos ahora mismo por WhatsApp y avanzamos al
          tiro.
        </p>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-verde px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5"
        >
          <span className="text-lg">💬</span> Escribir por WhatsApp
        </a>
        <button
          onClick={() => setEstado("idle")}
          className="mt-4 block w-full text-sm font-semibold text-navy/60 hover:text-navy"
        >
          Enviar otro registro
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-crema-2 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre" name="nombre" required placeholder="Tu nombre" />
        <Campo label="Nombre del negocio" name="negocio" required placeholder="Ej. Almacén Doña Rosa" />
        <Campo label="WhatsApp" name="whatsapp" required type="tel" placeholder="+56 9 ..." />
        <Campo label="Comuna / Ciudad" name="comuna" required placeholder="Ej. Puente Alto" />

        <label className="text-sm font-bold text-navy">
          Tipo de negocio
          <select
            name="tipoNegocio"
            required
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
          >
            <option value="" disabled>Selecciona…</option>
            {tiposNegocio.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-navy">
          Interés en un Punto Benechito
          <select
            name="interesPunto"
            required
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
          >
            <option value="" disabled>Selecciona…</option>
            {nivelesInteres.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex items-center gap-3 rounded-xl bg-crema/40 px-4 py-3 text-sm font-semibold text-navy">
        <input
          type="checkbox"
          name="interesHelados"
          value="si"
          className="h-5 w-5 rounded accent-naranja"
        />
        También me interesan los helados artesanales 🍦
      </label>

      <label className="mt-4 block text-sm font-bold text-navy">
        Observaciones (opcional)
        <textarea
          name="observaciones"
          rows={3}
          placeholder="Horario, ubicación, dudas…"
          className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
        />
      </label>

      {estado === "error" && (
        <p className="mt-3 rounded-xl bg-rojo/10 px-4 py-2 text-sm font-semibold text-rojo">
          Ups, algo falló al enviar. Inténtalo de nuevo o escríbenos por WhatsApp.
        </p>
      )}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="mt-5 w-full rounded-full bg-naranja px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-naranja-2 disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : "Quiero un Punto Benechito"}
      </button>
      <p className="mt-3 text-center text-xs text-choco-2">
        Te contactamos por WhatsApp. Sin compromiso.
      </p>
    </form>
  );
}

function Campo({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-bold text-navy">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
      />
    </label>
  );
}
