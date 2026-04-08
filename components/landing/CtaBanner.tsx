import Link from "next/link";
import { Container } from "@/components/landing/Container";

export function CtaBanner() {
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-5 rounded-[1.7rem] border border-indigo-400/45 bg-gradient-to-br from-indigo-600 to-indigo-500 px-7 py-7 text-white shadow-[0_18px_36px_rgba(67,56,202,0.3)] lg:flex-nowrap lg:px-12 lg:py-12">
        <div className="flex-grow text-center lg:text-left">
          <h2 className="text-2xl font-semibold lg:text-3xl">
            Ready to find or offer eldercare support?
          </h2>
          <p className="mt-2 text-white/90 lg:text-xl">
            Join Silver Directory and connect directly without agency lock-in.
          </p>
        </div>
        <div className="w-full flex-shrink-0 text-center lg:w-auto">
          <Link
            href="/directory"
            className="secondary-btn mx-auto inline-block border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 lg:px-10 lg:py-5"
          >
            Browse Caregivers
          </Link>
        </div>
      </div>
    </Container>
  );
}
