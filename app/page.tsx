import Link from "next/link";
import SiteHeader from "@/components/site-header";

const valueProps = [
  {
    title: "Direct listings",
    description:
      "Caregiver profiles are listed directly so families can browse and contact quickly.",
  },
  {
    title: "In-app family-to-caregiver chat",
    description:
      "Families start conversations in-app first, then share details only when ready.",
  },
  {
    title: "Hyper-local notice board model",
    description:
      "No auto-matching and no built-in scheduling. Browse and coordinate directly.",
  },
];

const rolePaths = [
  {
    title: "I need a caregiver",
    description:
      "Browse caregiver profiles, compare rates, and start in-app chat safely.",
    href: "/directory",
    cta: "Find a caregiver",
  },
  {
    title: "I want to list my services",
    description:
      "Create your profile and get listed for families looking for eldercare support.",
    href: "/for-nurses",
    cta: "Create caregiver profile",
  },
];

const firstMeetingChecklist = [
  "Run a short video call before confirming the first visit.",
  "Confirm caregiver identity and name against profile details.",
  "Share care needs clearly: tasks, schedule, mobility needs, medications.",
  "Agree payment method and timing before the first shift.",
];

const identityChecklist = [
  "Request a quick video call and photo confirmation before first visit.",
  "Confirm profile photo matches the caregiver attending.",
  "Confirm agreed scope and responsibilities before handover.",
];

export default function Home() {
  return (
    <div className="site-shell text-warm-ink">
      <SiteHeader />

      <main className="grid items-start gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-8 page-enter">
          <div className="space-y-5">
            <h1 className="font-display text-[clamp(2.05rem,5.7vw,4.15rem)] leading-[1.04] font-bold tracking-[-0.026em] text-warm-ink">
              Silver Directory helps families find local eldercare support fast.
            </h1>
            <p className="max-w-[44rem] text-[clamp(1rem,1.35vw,1.18rem)] leading-[1.72] text-warm-muted">
              A zero-commission classifieds board where caregivers list services
              and families connect directly for temporary eldercare support.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {rolePaths.map((path) => (
              <article
                key={path.title}
                className="flex h-full flex-col rounded-card border border-warm-border bg-warm-surface p-6 shadow-soft"
              >
                <h2 className="text-lg font-bold text-warm-ink">{path.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-warm-muted">{path.description}</p>
                <Link
                  href={path.href}
                  className="mt-5 inline-flex min-h-[2.9rem] w-full items-center justify-center rounded-xl bg-sage-500 px-5 py-3 text-[0.95rem] font-bold tracking-[0.01em] text-white shadow-sm transition hover:-translate-y-px hover:bg-sage-600 hover:shadow-md"
                >
                  {path.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="page-enter overflow-hidden rounded-panel border border-warm-border bg-warm-surface p-6 shadow-soft-lg">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-600">
              Platform highlights
            </p>
            <div className="stagger space-y-3">
              {valueProps.map((item) => (
                <article
                  key={item.title}
                  className="rounded-card border border-warm-border bg-warm-surface-soft p-4 shadow-sm"
                >
                  <h2 className="text-[1.01rem] font-bold text-warm-ink">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-warm-muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <section className="mt-6 rounded-panel border border-warm-border bg-warm-surface p-6 shadow-soft md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-card border border-[#edcfbe] bg-terracotta-100 p-4">
            <h2 className="text-base font-bold text-terracotta-700">Not for emergencies</h2>
            <p className="mt-2 text-sm leading-6 text-[#8e634b]">
              Silver Directory is not an emergency service. For urgent medical emergencies,
              call 995 immediately.
            </p>
          </article>

          <article className="rounded-card border border-warm-border bg-warm-surface-soft p-4">
            <h2 className="text-base font-bold text-warm-ink">Scope-of-care disclaimer</h2>
            <p className="mt-2 text-sm leading-6 text-warm-muted">
              Caregivers are independent professionals. Families and caregivers must align
              responsibilities, limits, and clinical escalation plans before care starts.
            </p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-card border border-warm-border bg-warm-surface-soft p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-sage-600">
              First-meeting safety checklist
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-warm-muted">
              {firstMeetingChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-card border border-warm-border bg-warm-surface-soft p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-sage-600">
              Identity verification checklist
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-warm-muted">
              {identityChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="mt-4 rounded-card border border-warm-border bg-warm-surface-soft p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-sage-600">
            Reporting and escalation flow
          </h3>
          <p className="mt-2 text-sm leading-6 text-warm-muted">
            If there is harassment, scam behavior, or agency poaching, report the user to
            platform support. Trust & Safety can review evidence and take action.
          </p>
        </article>
      </section>
    </div>
  );
}
