"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Shield, BookOpen, Users, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Foods", href: "/admin/foods", icon: Apple },
  { label: "Protocols", href: "/admin/protocols", icon: Shield },
  { label: "Reference Data", href: "/admin/reference", icon: BookOpen },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Usage", href: "/admin/usage", icon: Gauge },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Wide screens: a sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-warm-200 bg-warm-50 md:flex">
        <div className="border-b border-warm-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-warm-900">Admin</h2>
          <p className="text-xs text-warm-500">Data management</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-2" aria-label="Admin sections">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-teal-50 text-teal-700"
                  : "text-warm-600 hover:bg-warm-100 hover:text-warm-900"
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Phones: the same sections as a scrolling strip under the header */}
      <nav
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-warm-200 bg-warm-50 px-2 py-1 md:hidden"
        aria-label="Admin sections"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              isActive(item.href) ? "bg-teal-50 text-teal-700" : "text-warm-600 hover:bg-warm-100"
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
