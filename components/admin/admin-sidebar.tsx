"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Shield, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Foods", href: "/admin/foods", icon: Apple },
  { label: "Protocols", href: "/admin/protocols", icon: Shield },
  { label: "Reference Data", href: "/admin/reference", icon: BookOpen },
  { label: "Users", href: "/admin/users", icon: Users },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-52 flex-col border-r border-warm-200 bg-warm-50">
      <div className="border-b border-warm-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-warm-900">Admin Portal</h2>
        <p className="text-xs text-warm-500">Data Management</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-teal-50 text-teal-700"
                  : "text-warm-600 hover:bg-warm-100 hover:text-warm-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
