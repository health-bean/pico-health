"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Log", href: "/log" },
  { label: "Chat", href: "/chat" },
  { label: "Reflect", href: "/reflect" },
  { label: "Insights", href: "/insights" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const pathname = usePathname();
  const { user, loading } = useSession();

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

        {/* User area: the name is the way to your account; signing out lives there */}
        <div className="flex items-center">
          {!loading && user && (
            <Link
              href="/settings"
              className="-mr-2 flex min-h-11 items-center rounded-lg px-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-200 hover:bg-teal-50 hover:text-teal-700"
            >
              {user.firstName}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
