"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, formInputClass } from "@/components/FormField";

interface KvRow {
  key: string;
  value: string;
}

const ACCEPTED_TYPES = "video/mp4,video/webm,video/ogg,video/quicktime";

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La subida a RustFS falló (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("La subida a RustFS falló por un error de red"));
    xhr.send(file);
  });
}

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [kvRows, setKvRows] = useState<KvRow[]>([{ key: "", value: "" }]);

  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isBusy = phase === "uploading" || phase === "saving";

  function addTagFromInput() {
    const value = tagInput.trim().toLowerCase();
    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
    setTagInput("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTagFromInput();
    } else if (event.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function updateKvRow(index: number, field: "key" | "value", value: string) {
    setKvRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Selecciona un archivo de vídeo");
      return;
    }
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setPhase("uploading");
    setProgress(0);

    try {
      const presignRes = await fetch("/api/videos/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "No se pudo preparar la subida");

      await uploadWithProgress(presignData.uploadUrl, file, setProgress);

      setPhase("saving");

      const kv: Record<string, string> = {};
      for (const row of kvRows) {
        if (row.key.trim()) kv[row.key.trim()] = row.value.trim();
      }
      const finalTags = tagInput.trim() ? [...tags, tagInput.trim().toLowerCase()] : tags;

      const createRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          tags: finalTags,
          kv,
          s3Key: presignData.s3Key,
          tamaño: file.size,
          contentType: file.type,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "No se pudo guardar el vídeo");

      router.push(`/videos/${createData.id}`);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Ha ocurrido un error subiendo el vídeo");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-400">Nueva ficha</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-100">Subir vídeo</h1>
      <p className="mt-2 text-sm text-ink-400">
        El archivo se sube directo a RustFS con una URL prefirmada; Next.js solo guarda la ficha.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 space-y-5 rounded-md border border-line-700 bg-vault-900 p-6"
      >
        <FormField label="Archivo de vídeo" htmlFor="file">
          <input
            id="file"
            data-testid="upload-file"
            type="file"
            accept={ACCEPTED_TYPES}
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={isBusy}
            className="block w-full text-sm text-ink-300 file:mr-4 file:rounded file:border-0 file:bg-brass-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-vault-950 hover:file:bg-brass-400"
          />
          {file && (
            <p className="mt-1.5 font-mono text-xs text-ink-400">
              {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
        </FormField>

        <FormField label="Nombre" htmlFor="nombre">
          <input
            id="nombre"
            data-testid="upload-nombre"
            required
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            disabled={isBusy}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Descripción" htmlFor="descripcion">
          <textarea
            id="descripcion"
            data-testid="upload-descripcion"
            rows={3}
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            disabled={isBusy}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Tags" htmlFor="tags" hint="Escribe y pulsa Enter o coma para añadir uno.">
          <div className="flex flex-wrap items-center gap-1.5 rounded border border-line-700 bg-vault-950 p-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full border border-tape-500/40 bg-tape-500/10 px-2 py-0.5 font-mono text-xs text-tape-400"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  aria-label={`Quitar tag ${tag}`}
                  className="hover:text-tape-200"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tags"
              data-testid="upload-tag-input"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTagFromInput}
              disabled={isBusy}
              placeholder={tags.length === 0 ? "demo, cliente…" : ""}
              className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-ink-100 outline-none placeholder:text-ink-400/60"
            />
          </div>
        </FormField>

        <FormField label="Metadatos clave-valor" htmlFor="kv-0">
          <div className="space-y-2">
            {kvRows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  id={`kv-${index}`}
                  data-testid={`upload-kv-key-${index}`}
                  placeholder="clave"
                  value={row.key}
                  onChange={(event) => updateKvRow(index, "key", event.target.value)}
                  disabled={isBusy}
                  className={formInputClass}
                />
                <input
                  data-testid={`upload-kv-value-${index}`}
                  placeholder="valor"
                  value={row.value}
                  onChange={(event) => updateKvRow(index, "value", event.target.value)}
                  disabled={isBusy}
                  className={formInputClass}
                />
                <button
                  type="button"
                  onClick={() => setKvRows((rows) => rows.filter((_, i) => i !== index))}
                  disabled={isBusy || kvRows.length === 1}
                  aria-label="Quitar par"
                  className="rounded border border-line-700 px-2 text-ink-400 hover:text-rust-400 disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setKvRows((rows) => [...rows, { key: "", value: "" }])}
              disabled={isBusy}
              className="text-xs font-medium text-brass-400 hover:text-brass-300"
            >
              + Añadir par
            </button>
          </div>
        </FormField>

        {phase === "uploading" && (
          <div data-testid="upload-progress">
            <div className="h-2 w-full overflow-hidden rounded-full bg-vault-800">
              <div
                className="h-full rounded-full bg-brass-500 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-ink-400">Subiendo a RustFS… {progress}%</p>
          </div>
        )}
        {phase === "saving" && <p className="font-mono text-xs text-ink-400">Guardando la ficha…</p>}

        {error && (
          <p role="alert" className="text-sm text-rust-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="upload-submit"
          disabled={isBusy}
          className="w-full rounded bg-brass-500 py-2.5 font-medium text-vault-950 transition-colors hover:bg-brass-400 disabled:opacity-60"
        >
          {isBusy ? "Subiendo…" : "Subir vídeo"}
        </button>
      </form>
    </div>
  );
}
