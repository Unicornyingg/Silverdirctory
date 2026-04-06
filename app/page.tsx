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
    title: "I wan to list my services",
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
    <div className="site-shell">
      <SiteHeader />

      <main className="grid items-start gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-8 page-enter">
          <div className="space-y-5">
            <h1 className="title-display">
              Silver Directory helps families find local eldercare support fast.
            </h1>
            <p className="subtitle-display">
              A zero-commission classifieds board where caregivers list services
              and families connect directly for temporary eldercare support.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {rolePaths.map((path) => (
              <article
                key={path.title}
                className="flex h-full flex-col rounded-xl border border-[#d8e3eb] bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,36,58,0.08)]"
              >
                <h2 className="text-lg font-bold text-[#10263f]">{path.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#5b6b80]">{path.description}</p>
                <Link href={path.href} className="primary-btn mt-4 w-full">
                  {path.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="surface-panel page-enter overflow-hidden p-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#285174]">
              Platform highlights
            </p>
            <div className="stagger space-y-3">
              {valueProps.map((item) => (
                <article
                  key={item.title}
                  className="rounded-xl border border-[#d8e3eb] bg-white/85 p-4"
                >
                  <h2 className="text-[1.01rem] font-bold text-[#10263f]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#5b6b80]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <section className="surface-panel mt-6 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h2 className="text-base font-bold text-rose-800">Not for emergencies</h2>
            <p className="mt-2 text-sm leading-6 text-rose-700">
              Silver Directory is not an emergency service. For urgent medical emergencies,
              call 995 immediately.
            </p>
          </article>

          <article className="rounded-xl border border-[#d8e3eb] bg-white/90 p-4">
            <h2 className="text-base font-bold text-[#1d3b59]">Scope-of-care disclaimer</h2>
            <p className="mt-2 text-sm leading-6 text-[#55677e]">
              Caregivers are independent professionals. Families and caregivers must align
              responsibilities, limits, and clinical escalation plans before care starts.
            </p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-[#d8e3eb] bg-white/90 p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#365575]">
              First-meeting safety checklist
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#566980]">
              {firstMeetingChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[#d8e3eb] bg-white/90 p-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#365575]">
              Identity verification checklist
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#566980]">
              {identityChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="mt-4 rounded-xl border border-[#d8e3eb] bg-white/90 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#365575]">
            Reporting and escalation flow
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#566980]">
            If there is harassment, scam behavior, or agency poaching, report the user to
            platform support. Trust & Safety can review evidence and take action.
          </p>
        </article>
      </section>
    </div>
  );
}
