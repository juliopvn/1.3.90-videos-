"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    tag: "[S3]",
    title: "Sube directo al storage",
    body: "El archivo viaja del navegador a RustFS con una URL prefirmada. Next.js nunca toca el binario.",
  },
  {
    tag: "[TAGS]",
    title: "Metadatos a tu medida",
    body: "Tags y pares clave-valor libres, sin esquema fijo. Anota lo que tú necesitarás para encontrarlo.",
  },
  {
    tag: "[MP4]",
    title: "Reproducción al instante",
    body: "El detalle de cada vídeo abre con el reproductor HTML5 nativo, sin plugins ni conversiones.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="stamp-in">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">
            Tu archivo privado de vídeo
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-100 sm:text-5xl">
            Cada vídeo sube con su propia ficha.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-300 sm:text-lg">
            El archivo va directo a tu storage S3 desde el navegador. VideoVault se queda con la
            ficha: nombre, tags y los metadatos que tú definas, para que lo encuentres en segundos,
            no rebuscando en carpetas.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {loading ? null : user ? (
              <Link
                href="/videos"
                className="rounded bg-brass-500 px-5 py-2.5 font-medium text-vault-950 transition-colors hover:bg-brass-400"
              >
                Ir a tu vault
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded bg-brass-500 px-5 py-2.5 font-medium text-vault-950 transition-colors hover:bg-brass-400"
                >
                  Crear cuenta gratis
                </Link>
                <Link href="/login" className="text-sm font-medium text-ink-300 hover:text-ink-100">
                  Ya tengo cuenta →
                </Link>
              </>
            )}
          </div>

          <dl className="mt-14 grid grid-cols-1 gap-6 border-t border-line-700 pt-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <dt className="font-mono text-xs text-tape-400">{feature.tag}</dt>
                <dd className="mt-2 text-sm font-semibold text-ink-100">{feature.title}</dd>
                <dd className="mt-1 text-sm leading-relaxed text-ink-400">{feature.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Ficha de ejemplo: el motivo firma de la app */}
        <div className="stamp-in ticket relative overflow-hidden pt-14 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] lg:justify-self-end lg:max-w-sm">
          <div className="absolute inset-x-0 top-0 flex h-14 items-center justify-between px-5">
            <span className="ticket-serial text-[11px] text-ink-400">
              Ficha Nº <span className="text-brass-400">000247</span>
            </span>
            <span className="font-mono text-[11px] text-ink-400">11 sep 2026</span>
          </div>

          <div className="px-5 pb-6 pt-2">
            <h3 className="font-display text-xl text-ink-100">keynote-lanzamiento.mp4</h3>
            <p className="mt-1 text-sm text-ink-300">Grabación completa de la presentación de producto.</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["lanzamiento", "producto", "2026"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-tape-500/40 bg-tape-500/10 px-2 py-0.5 font-mono text-[11px] text-tape-400"
                >
                  {tag}
                </span>
              ))}
            </div>

            <dl className="mt-5 space-y-1.5 border-t border-dashed border-line-600 pt-4 font-mono text-[11px] text-ink-400">
              <div className="flex justify-between">
                <dt>proyecto</dt>
                <dd className="text-ink-200">acme-launch</dd>
              </div>
              <div className="flex justify-between">
                <dt>cliente</dt>
                <dd className="text-ink-200">acme-corp</dd>
              </div>
              <div className="flex justify-between">
                <dt>tamaño</dt>
                <dd className="text-ink-200">842.0 MB</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
