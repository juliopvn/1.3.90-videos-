import Link from "next/link";
import type { VideoDTO } from "@/lib/db/models/video";
import { formatBytes, formatDate, toSerial } from "@/lib/format";

export function VideoCard({ video }: { video: VideoDTO }) {
  const kvCount = Object.keys(video.kv).length;

  return (
    <Link
      href={`/videos/${video.id}`}
      data-testid="video-card"
      data-video-nombre={video.nombre}
      className="ticket group relative block overflow-hidden pt-14 transition-all hover:-translate-y-0.5 hover:border-brass-500/60"
    >
      <div className="absolute inset-x-0 top-0 flex h-14 items-center justify-between px-4">
        <span className="ticket-serial text-[11px] text-ink-400">
          Nº <span className="text-brass-400">{toSerial(video.id)}</span>
        </span>
        <span className="font-mono text-[11px] text-ink-400">{formatDate(video.fecha)}</span>
      </div>

      <div className="px-4 pb-4 pt-1">
        <h3 className="line-clamp-1 font-display text-lg text-ink-100 transition-colors group-hover:text-brass-300">
          {video.nombre}
        </h3>
        {video.descripcion && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-300">{video.descripcion}</p>
        )}

        {video.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
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

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-line-600 pt-3 font-mono text-[11px] text-ink-400">
          <span>{formatBytes(video.tamaño)}</span>
          {kvCount > 0 && (
            <span>
              {kvCount} metadato{kvCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
