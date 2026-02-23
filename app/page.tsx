import Link from "next/link";
import SiteHeader from "@/components/site-header";

const valueProps = [
  {
    title: "Verified professionals",
    description:
      "Every profile is hidden by default and only published after manual license review.",
  },
  {
    title: "Direct family-to-caregiver contact",
    description:
      "No agency handoff. Families connect directly with qualified caregivers for faster care matching.",
  },
  {
    title: "Weekend and respite focused",
    description:
      "Designed for ad-hoc eldercare support when families need trusted help quickly.",
  },
];

export default function Home() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="grid items-start gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-8 page-enter">
          <div className="space-y-5">
            <h1 className="title-display">
              A trusted caregiver directory for families caring for older adults.
            </h1>
            <p className="subtitle-display">
              Caregiver Network helps families discover verified registered
              nurses, while giving caregivers a clean onboarding flow and direct
              client access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/directory" className="primary-btn">
              Browse Verified Caregivers
            </Link>
            <Link href="/for-nurses" className="secondary-btn">
              Join as a Caregiver
            </Link>
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
    </div>
  );
}
