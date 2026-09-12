"use client";

import { useState, type FormEvent } from "react";
import { formInputClass } from "@/components/FormField";

export interface SearchFilters {
  q: string;
  tags: string;
  kv: string;
}

export function SearchBar({
  initial,
  onSearch,
}: {
  initial: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
}) {
  const [filters, setFilters] = useState<SearchFilters>(initial);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch(filters);
  }

  function handleClear() {
    const cleared: SearchFilters = { q: "", tags: "", kv: "" };
    setFilters(cleared);
    onSearch(cleared);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-md border border-line-700 bg-vault-900 p-4 sm:grid-cols-[1.3fr_1fr_1fr_auto_auto]"
    >
      <input
        data-testid="search-q"
        aria-label="Buscar por nombre o descripción"
        placeholder="Nombre o descripción…"
        value={filters.q}
        onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
        className={formInputClass}
      />
      <input
        data-testid="search-tags"
        aria-label="Filtrar por tags"
        placeholder="tags: demo, cliente…"
        value={filters.tags}
        onChange={(event) => setFilters((prev) => ({ ...prev, tags: event.target.value }))}
        className={formInputClass}
      />
      <input
        data-testid="search-kv"
        aria-label="Filtrar por metadatos clave:valor"
        placeholder="kv: proyecto:acme…"
        value={filters.kv}
        onChange={(event) => setFilters((prev) => ({ ...prev, kv: event.target.value }))}
        className={formInputClass}
      />
      <button
        type="submit"
        data-testid="search-submit"
        className="rounded bg-brass-500 px-4 py-2 text-sm font-medium text-vault-950 transition-colors hover:bg-brass-400"
      >
        Buscar
      </button>
      <button
        type="button"
        data-testid="search-clear"
        onClick={handleClear}
        className="rounded border border-line-700 px-4 py-2 text-sm text-ink-300 transition-colors hover:text-ink-100"
      >
        Limpiar
      </button>
    </form>
  );
}
