"use client";

import { useActionState } from "react";
import { use } from "react";
import Logo from "@/components/Logo";
import { login, type LoginState } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = use(searchParams);
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo claro />
        </div>
        <form
          action={formAction}
          className="rounded-3xl bg-white p-7 shadow-2xl"
        >
          <h1 className="text-center text-2xl font-extrabold text-navy">
            Panel Benechito
          </h1>
          <p className="mt-1 text-center text-sm text-choco-2">
            Acceso del equipo
          </p>

          <input type="hidden" name="next" value={next ?? "/panel"} />

          <label className="mt-6 block text-sm font-bold text-navy">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
            />
          </label>
          <label className="mt-4 block text-sm font-bold text-navy">
            Contraseña
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
            />
          </label>

          {state.error && (
            <p className="mt-4 rounded-xl bg-rojo/10 px-4 py-2 text-sm font-semibold text-rojo">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full bg-naranja px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-naranja-2 disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
