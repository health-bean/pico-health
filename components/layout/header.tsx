"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Chat", href: "/chat" },
  { label: "Log", href: "/log" },
  { label: "Reflect", href: "/reflect" },
  { label: "Insights", href: "/insights" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-light)] bg-[var(--color-surface-card)]/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/log" className="flex items-center group">
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-teal-800 group-hover:text-teal-900 transition-colors">
            Pico Health
          </span>
        </Link>

        {/* Desktop nav */}
        {!loading && user && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-teal-50/50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            {user.isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname.startsWith("/admin")
                    ? "bg-teal-50 text-teal-700"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-teal-50/50"
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        {/* User area */}
        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <span className="text-sm text-[var(--color-text-secondary)]">
                {user.firstName}
              </span>
              <button
                onClick={handleLogout}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-[var(--color-text-muted)] hover:bg-teal-50 hover:text-teal-600",
                  "transition-all duration-200"
                )}
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
