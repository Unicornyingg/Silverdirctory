import Link from "next/link";
import SiteHeader from "@/components/site-header";
import { CARE_SERVICE_OPTIONS } from "@/lib/care-services";
import { SERVICE_REGION_OPTIONS } from "@/lib/service-regions";

type Highlight = {
  title: string;
  description: string;
};

const PRIMARY_HIGHLIGHTS: Highlight[] = [
  {
    title: "Direct caregiver listings",
    description:
      "Families browse profiles, compare rates, and contact caregivers directly without waiting for coordinator matching.",
  },
  {
    title: "In-app chat first",
    description:
      "Start conversations in the platform first, then finalize home-care arrangements only when both sides are ready.",
  },
  {
    title: "Zero commission model",
    description:
      "Silver Directory does not deduct wage percentages from caregivers. Families and caregivers agree payment directly.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "1. Browse profiles",
    description:
      "Use location, service, and max-rate filters to shortlist caregivers that match your care needs.",
  },
  {
    title: "2. Start a secure chat",
    description:
      "Message your shortlisted caregivers in-app to discuss tasks, timing, and expectations before any visit.",
  },
  {
    title: "3. Confirm details directly",
    description:
      "Agree rates, payment method, and care scope privately. There is no lock-in contract imposed by the platform.",
  },
];

const SAFETY_NOTES = [
  "Arrange a short video call before the first home visit.",
  "Confirm caregiver identity against profile details before handover.",
  "Discuss care boundaries, escalation plans, and payment timing clearly.",
  "Call 995 for urgent medical emergencies.",
];

const FAQ_PREVIEW = [
  {
    question: "How does Silver Directory match families with caregivers?",
    answer:
      "We do not auto-match. Families choose caregivers directly after reviewing profile details and rates.",
  },
  {
    question: "Does the platform process caregiver wages?",
    answer:
      "No. Wage payments are agreed and handled directly between families and caregivers.",
  },
  {
    question: "Can caregivers keep 100% of their earnings?",
    answer:
      "Yes. Silver Directory does not charge matching commissions or wage percentages.",
  },
];

const regionBadges = SERVICE_REGION_OPTIONS.filter((region) => region.value !== "No Preference");

export default function Home() {
  return (
    <div className="site-shell text-warm-ink">
      <SiteHeader />

      <main className="space-y-6">
        <section className="surface-panel page-enter overflow-hidden p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="eyebrow">Silver Directory</p>
              <h1 className="mt-4 font-display text-[clamp(2rem,5vw,4rem)] leading-[1.05] font-bold tracking-[-0.025em] text-warm-ink">
                A hyper-local eldercare marketplace for families and independent caregivers.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-warm-muted md:text-lg">
                Browse local caregiver listings, compare rates, and start in-app chat without agency lock-in or auto-matching.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/directory" className="primary-btn min-w-[210px]">
                  Find a caregiver
                </Link>
                <Link href="/for-nurses" className="secondary-btn min-w-[210px]">
                  Create caregiver profile
                </Link>
              </div>
            </div>

            <aside className="rounded-card border border-warm-border bg-warm-surface-soft p-5 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-600">
                Platform Snapshot
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <article className="rounded-xl border border-[#cfe0c7] bg-sage-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-600">
                    Care Model
                  </p>
                  <p className="mt-2 text-sm leading-6 text-warm-muted">
                    Direct listing board for temporary eldercare support in Singapore.
                  </p>
                </article>
                <article className="rounded-xl border border-sand-200 bg-sand-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8d6a52]">
                    Matching
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#7b5f4d]">
                    No algorithmic auto-assignment. Families decide who to contact.
                  </p>
                </article>
                <article className="rounded-xl border border-[#eacabd] bg-peach-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-peach-600">
                    Payments
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#815948]">
                    No wage gateway. Payment method and timing are agreed directly.
                  </p>
                </article>
              </div>
            </aside>
          </div>
        </section>

        <section className="surface-panel p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Benefits</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
                Why families and caregivers use Silver Directory
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PRIMARY_HIGHLIGHTS.map((item) => (
              <article
                key={item.title}
                className="rounded-card border border-warm-border bg-warm-surface-soft p-5 shadow-sm"
              >
                <h3 className="text-lg font-bold text-warm-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-warm-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="surface-panel p-6 md:p-8">
            <p className="eyebrow">How It Works</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
              Three simple steps from search to first shift
            </h2>
            <div className="mt-5 space-y-3">
              {HOW_IT_WORKS.map((step) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-warm-border bg-warm-surface-soft p-4"
                >
                  <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-sage-600">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-warm-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-panel p-6 md:p-8">
            <p className="eyebrow">Safety Basics</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
              Keep first-time visits safe and clear
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-warm-muted">
              {SAFETY_NOTES.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-xl border border-warm-border bg-warm-surface-soft p-3.5">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-sage-100 text-xs font-bold text-sage-600">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="surface-panel p-6 md:p-8">
          <p className="eyebrow">Service Scope</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
            Home personal care services caregivers can list
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {CARE_SERVICE_OPTIONS.map((service) => (
              <span
                key={service}
                className="rounded-full border border-warm-border bg-warm-surface-soft px-3 py-1.5 text-xs font-semibold text-warm-muted"
              >
                {service}
              </span>
            ))}
          </div>
        </section>

        <section className="surface-panel p-6 md:p-8">
          <p className="eyebrow">Coverage</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
            Region-based listings across Singapore
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {regionBadges.map((region) => (
              <article
                key={region.value}
                className="rounded-xl border border-warm-border bg-warm-surface-soft p-4"
              >
                <h3 className="text-base font-bold text-warm-ink">{region.value}</h3>
                <p className="mt-2 text-xs leading-5 text-warm-muted">{region.areas}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <article className="surface-panel p-6 md:p-8">
            <p className="eyebrow">FAQ Preview</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink md:text-3xl">
              Common questions before hiring or listing
            </h2>
            <div className="mt-5 space-y-3">
              {FAQ_PREVIEW.map((item) => (
                <details key={item.question} className="rounded-xl border border-warm-border bg-warm-surface-soft">
                  <summary className="faq-summary">
                    <span>{item.question}</span>
                    <span className="faq-summary-icon">+</span>
                  </summary>
                  <div className="px-4 pb-4 text-sm leading-6 text-warm-muted">{item.answer}</div>
                </details>
              ))}
            </div>
          </article>

          <aside className="surface-panel flex flex-col justify-between p-6 md:p-8">
            <div>
              <p className="eyebrow">Need Full Guidance?</p>
              <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-warm-ink">
                Open detailed FAQs for families and caregivers
              </h3>
              <p className="mt-3 text-sm leading-6 text-warm-muted">
                Read complete guidance on hiring flow, payments, registration, and platform rules.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Link href="/faq/families" className="primary-btn text-sm">
                FAQ for Families
              </Link>
              <Link href="/faq/caregivers" className="secondary-btn text-sm">
                FAQ for Caregivers
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
