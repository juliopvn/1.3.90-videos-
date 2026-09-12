"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { VideoDTO } from "@/lib/db/models/video";
import { formatBytes, formatDate, toSerial } from "@/lib/format";

type PlayerState = "loading" | "ready" | "error";

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [video, setVideo] = useState<VideoDTO | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>("loading");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [detailRes, presignRes] = await Promise.all([
          fetch(`/api/videos/${id}`),
          fetch(`/api/videos/${id}/presign-download`),
        ]);

        if (ignore) return;

        if (detailRes.status === 404 || presignRes.status === 404) {
          setNotFound(true);
          return;
        }

        const detailData = await detailRes.json();
        const presignData = await presignRes.json();
        if (ignore) return;

        if (!detailRes.ok) throw new Error(detailData.error ?? "No se pudo cargar el vídeo");
        if (!presignRes.ok) throw new Error(presignData.error ?? "No se pudo preparar la reproducción");

        setNotFound(false);
        setPlayerState("loading");
        setVideo(detailData as VideoDTO);
        setVideoUrl(presignData.url as string);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el vídeo");
          setPlayerState("error");
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("¿Borrar este vídeo? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo borrar el vídeo");
      router.push("/videos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar el vídeo");
      setDeleting(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="font-display text-2xl text-ink-100">Esta ficha ya no existe.</p>
        <p className="mt-2 text-sm text-ink-400">El vídeo fue borrado o el enlace es incorrecto.</p>
        <Link href="/videos" className="mt-6 inline-block text-brass-400 hover:text-brass-300">
          ← Volver a tus vídeos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/videos" className="text-sm text-ink-400 hover:text-ink-100">
        ← Volver a tus vídeos
      </Link>

      {!video ? (
        <p className="mt-8 font-mono text-sm text-ink-400">Cargando ficha…</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-md border border-line-700 bg-black">
              {videoUrl && (
                <video
                  data-testid="video-player"
                  controls
                  preload="metadata"
                  className="aspect-video w-full"
                  onLoadedData={() => setPlayerState("ready")}
                  onError={() => setPlayerState("error")}
                >
                  <source src={videoUrl} type={video.contentType} />
                </video>
              )}
            </div>
            {playerState === "loading" && (
              <p className="mt-2 font-mono text-xs text-ink-400">Preparando el reproductor…</p>
            )}
            {playerState === "error" && (
              <p role="alert" data-testid="video-player-error" className="mt-2 text-sm text-rust-400">
                No se pudo reproducir el vídeo. La URL prefirmada puede haber caducado — recarga la página.
              </p>
            )}
          </div>

          <aside className="ticket relative overflow-hidden pt-14">
            <div className="absolute inset-x-0 top-0 flex h-14 items-center justify-between px-5">
              <span className="ticket-serial text-[11px] text-ink-400">
                Nº <span className="text-brass-400">{toSerial(video.id)}</span>
              </span>
              <span className="font-mono text-[11px] text-ink-400">{formatDate(video.fecha)}</span>
            </div>

            <div className="px-5 pb-5 pt-1">
              <h1 data-testid="video-title" className="font-display text-2xl text-ink-100">
                {video.nombre}
              </h1>
              {video.descripcion && <p className="mt-2 text-sm text-ink-300">{video.descripcion}</p>}

              {video.tags.length > 0 && (
                <div data-testid="video-tags" className="mt-4 flex flex-wrap gap-1.5">
                  {video.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-tape-500/40 bg-tape-500/10 px-2 py-0.5 font-mono text-[11px] text-tape-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <dl className="mt-5 space-y-1.5 border-t border-dashed border-line-600 pt-4 font-mono text-[11px] text-ink-400">
                <div className="flex justify-between">
                  <dt>tamaño</dt>
                  <dd className="text-ink-200">{formatBytes(video.tamaño)}</dd>
                </div>
                {Object.entries(video.kv).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="truncate">{key}</dt>
                    <dd className="truncate text-ink-200">{value}</dd>
                  </div>
                ))}
              </dl>

              {error && (
                <p role="alert" className="mt-4 text-sm text-rust-400">
                  {error}
                </p>
              )}

              <button
                data-testid="delete-button"
                onClick={handleDelete}
                disabled={deleting}
                className="mt-6 w-full rounded border border-rust-500/50 py-2 text-sm font-medium text-rust-400 transition-colors hover:bg-rust-500/10 disabled:opacity-60"
              >
                {deleting ? "Borrando…" : "Borrar vídeo"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
