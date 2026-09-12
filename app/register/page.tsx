"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FormField, formInputClass } from "@/components/FormField";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.push("/videos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16 sm:py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">Nuevo depositante</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink-100">Crea tu cuenta</h1>
      <p className="mt-2 text-sm text-ink-400">Un email y una contraseña bastan para abrir tu vault.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4 rounded-md border border-line-700 bg-vault-900 p-6">
        <FormField label="Nombre" htmlFor="name">
          <input
            id="name"
            name="name"
            data-testid="register-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            data-testid="register-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
          <input
            id="password"
            name="password"
            data-testid="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={formInputClass}
          />
        </FormField>

        {error && (
          <p role="alert" data-testid="register-error" className="text-sm text-rust-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="register-submit"
          disabled={submitting}
          className="w-full rounded bg-brass-500 py-2.5 font-medium text-vault-950 transition-colors hover:bg-brass-400 disabled:opacity-60"
        >
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-brass-400 hover:text-brass-300">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
