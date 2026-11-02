import type { Metadata } from "next";
import { LANDING_HERO } from "@/lib/landing-content";
import { normalizeRef } from "@/lib/waitlist";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Approach } from "@/components/landing/approach";
import { Team } from "@/components/landing/team";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

// Public landing page, ported from healthbean.io in Pico teal.
// Signed-in visitors never see it: middleware sends them to /log.

export const metadata: Metadata = {
  title: { absolute: "Pico Health · Find the patterns behind chronic illness" },
  description: LANDING_HERO.subtitle,
  openGraph: {
    title: "Pico Health",
    description: LANDING_HERO.subtitle,
    url: "https://picohealth.app",
    siteName: "Pico Health",
    type: "website",
  },
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const refCode = normalizeRef(params.ref) ?? undefined;
  const inviteRequired = params.invite === "required";

  return (
    <main className="landing bg-lp-cream">
      {inviteRequired && (
        <p role="status" className="bg-teal-700 px-6 py-3 text-center text-sm text-white">
          Pico is invite-only for now. Join the early-access list below and we&apos;ll let you in soon.
        </p>
      )}
      <Hero refCode={refCode} />
      <Problem />
      <Approach />
      <Team />
      <Cta refCode={refCode} />
      <Footer />
    </main>
  );
}
