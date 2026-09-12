"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FormField, formInputClass } from "@/components/FormField";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/videos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16 sm:py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">Acceso al vault</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink-100">Inicia sesión</h1>
      <p className="mt-2 text-sm text-ink-400">Entra con tu email y contraseña para ver tus vídeos.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4 rounded-md border border-line-700 bg-vault-900 p-6">
        <FormField label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            data-testid="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password">
          <input
            id="password"
            name="password"
            data-testid="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={formInputClass}
          />
        </FormField>

        {error && (
          <p role="alert" data-testid="login-error" className="text-sm text-rust-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="login-submit"
          disabled={submitting}
          className="w-full rounded bg-brass-500 py-2.5 font-medium text-vault-950 transition-colors hover:bg-brass-400 disabled:opacity-60"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-brass-400 hover:text-brass-300">
          Créala aquí
        </Link>
      </p>
    </div>
  );
}
