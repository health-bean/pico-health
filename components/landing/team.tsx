import { LANDING_TEAM } from "@/lib/landing-content";

const AVATAR = ["bg-clay-500", "bg-lp-800"];

export function Team() {
  return (
    <section id="team" className="px-6 pb-lp-section md:px-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold leading-tight md:text-4xl">{LANDING_TEAM.headline}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {LANDING_TEAM.members.map((member, i) => (
            <div key={member.name} className="flex gap-4 rounded-2xl border border-lp-cream-dark bg-surface-card p-6">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${AVATAR[i % 2]}`}>
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-surface">{member.initials}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-clay-600">{member.role}</p>
                <p className="mt-3 text-[0.95rem] leading-relaxed">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
