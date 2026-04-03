import Link from "next/link";
import SiteHeader from "@/components/site-header";

export default function FAQHubPage() {
  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <p className="eyebrow">Help Center</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56677c]">
          Choose the FAQ set you need.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link href="/faq/families" className="surface-panel p-5 transition hover:shadow-[0_12px_30px_rgba(15,36,58,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#5b7290]">
              For Families
            </p>
            <p className="mt-2 text-lg font-bold text-[#10233b]">
              Finding, hiring, fees, and trust
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5e7086]">
              Learn how to browse caregivers, contact them, and manage care arrangements.
            </p>
          </Link>

          <Link href="/faq/caregivers" className="surface-panel p-5 transition hover:shadow-[0_12px_30px_rgba(15,36,58,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#5b7290]">
              For Caregivers
            </p>
            <p className="mt-2 text-lg font-bold text-[#10233b]">
              Registration, verification, jobs, and safety
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5e7086]">
              Understand account requirements, payout model, and platform rules.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
