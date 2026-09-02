"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OnboardingCheck } from "@/components/layout/OnboardingCheck";
import { ToastProvider } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  return (
    <OnboardingCheck>
      <ToastProvider>
        {isOnboarding ? (
          // Onboarding gets a clean, full-screen layout — no nav chrome
          <>{children}</>
        ) : (
          <div className="flex min-h-dvh flex-col bg-[var(--color-surface)]">
            <Header />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <MobileNav />
          </div>
        )}
      </ToastProvider>
    </OnboardingCheck>
  );
}
