"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoCard } from "@/components/VideoCard";
import { SearchBar, type SearchFilters } from "@/components/SearchBar";
import type { VideoDTO } from "@/lib/db/models/video";

const EMPTY_FILTERS: SearchFilters = { q: "", tags: "", kv: "" };
const PAGE_SIZE = 12;

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isSearching = Boolean(filters.q.trim() || filters.tags.trim() || filters.kv.trim());

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        let url: string;
        if (isSearching) {
          const params = new URLSearchParams();
          if (filters.q.trim()) params.set("q", filters.q.trim());
          if (filters.tags.trim()) params.set("tags", filters.tags.trim());
          if (filters.kv.trim()) params.set("kv", filters.kv.trim());
          url = `/api/videos/search?${params.toString()}`;
        } else {
          url = `/api/videos?page=${page}&pageSize=${PAGE_SIZE}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los vídeos");
        if (ignore) return;

        setError(null);
        setVideos(data.items as VideoDTO[]);
        setTotalPages((data.totalPages as number) ?? 1);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "No se pudieron cargar los vídeos");
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [filters, isSearching, page]);

  function handleSearch(next: SearchFilters) {
    setPage(1);
    setFilters(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">Tu vault</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink-100">Vídeos</h1>
        </div>
        <Link
          href="/videos/upload"
          className="rounded bg-brass-500 px-4 py-2 text-sm font-medium text-vault-950 transition-colors hover:bg-brass-400"
        >
          Subir vídeo
        </Link>
      </div>

      <div className="mt-6">
        <SearchBar initial={EMPTY_FILTERS} onSearch={handleSearch} />
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-rust-400">
          {error}
        </p>
      )}

      {videos === null ? (
        <p className="mt-10 font-mono text-sm text-ink-400">Cargando fichas…</p>
      ) : videos.length === 0 ? (
        <div data-testid="empty-state" className="mt-16 rounded-md border border-dashed border-line-600 p-10 text-center">
          <p className="font-display text-xl text-ink-100">
            {isSearching ? "Ninguna ficha coincide con tu búsqueda." : "Tu vault está vacío."}
          </p>
          <p className="mt-2 text-sm text-ink-400">
            {isSearching
              ? "Prueba con otro nombre, tag o metadato."
              : "Sube tu primer vídeo para empezar tu archivo."}
          </p>
          {!isSearching && (
            <Link
              href="/videos/upload"
              className="mt-5 inline-block rounded bg-brass-500 px-4 py-2 text-sm font-medium text-vault-950 hover:bg-brass-400"
            >
              Subir el primero
            </Link>
          )}
        </div>
      ) : (
        <>
          <div data-testid="video-list" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {!isSearching && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 font-mono text-sm text-ink-300">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-line-700 px-3 py-1.5 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span>
                Página {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-line-700 px-3 py-1.5 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
