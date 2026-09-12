import type { ReactNode } from "react";

export const formInputClass =
  "w-full rounded border border-line-700 bg-vault-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400/60 focus:border-brass-400";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
