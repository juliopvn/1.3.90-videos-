"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format";

interface DashboardData {
  totalVideos: number;
  totalBytes: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "No se pudo cargar el dashboard");
        setData(json as DashboardData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard"));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">Registro del vault</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-100">Dashboard</h1>
      <p className="mt-2 max-w-lg text-sm text-ink-400">
        Lecturas en vivo, calculadas con una agregación sobre los metadatos de tus vídeos.
      </p>

      {error && (
        <p role="alert" className="mt-6 text-sm text-rust-400">
          {error}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Gauge label="Vídeos guardados" testId="stat-total-videos" value={data ? String(data.totalVideos) : "—"} />
        <Gauge
          label="Espacio ocupado"
          testId="stat-total-bytes"
          value={data ? formatBytes(data.totalBytes) : "—"}
          hint={data ? `${data.totalBytes.toLocaleString("es-ES")} bytes` : undefined}
        />
      </div>
    </div>
  );
}

function Gauge({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId: string }) {
  return (
    <div className="rounded-md border border-line-700 bg-vault-900 p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink-400">{label}</p>
        <span aria-hidden className="size-2 rounded-full bg-brass-500" />
      </div>
      <p data-testid={testId} className="tally mt-3 text-5xl font-semibold text-ink-100">
        {value}
      </p>
      {hint && <p className="mt-2 font-mono text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
