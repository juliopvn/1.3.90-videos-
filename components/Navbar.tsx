"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/videos", label: "Vídeos" },
  { href: "/videos/upload", label: "Subir" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="border-b border-line-700 bg-vault-950/95 backdrop-blur supports-[backdrop-filter]:bg-vault-950/80 sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-full border border-brass-500 text-[10px] font-mono font-semibold text-brass-400"
          >
            V
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink-100">
            VideoVault
          </span>
        </Link>

        {user && (
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href === "/videos" && pathname?.startsWith("/videos/") && !pathname.startsWith("/videos/upload"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-3 py-1.5 transition-colors ${
                    active
                      ? "text-brass-400 bg-vault-900"
                      : "text-ink-300 hover:text-ink-100 hover:bg-vault-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <span className="hidden md:inline font-mono text-xs text-ink-400">{user.email}</span>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="rounded border border-line-700 px-3 py-1.5 text-ink-300 transition-colors hover:border-rust-500 hover:text-rust-400"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                data-testid="nav-login"
                className="rounded px-3 py-1.5 text-ink-300 hover:text-ink-100"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                data-testid="nav-register"
                className="rounded bg-brass-500 px-3 py-1.5 font-medium text-vault-950 transition-colors hover:bg-brass-400"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
