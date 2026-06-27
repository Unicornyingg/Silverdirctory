import Link from "next/link";
import { Container } from "@/components/landing/Container";

export function SiteFooter() {
  return (
    <footer className="relative bg-[var(--background)] py-8">
      <Container>
        <div className="mx-auto max-w-screen-xl border-t border-[var(--line)] px-1 pt-8 lg:pt-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center space-x-2.5 font-display text-2xl font-semibold text-[var(--foreground)]">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-black text-[var(--signal)]">
                  SD
                </span>
                <span>Silver Directory</span>
              </Link>

              <div className="copy-soft mt-4 max-w-md">
                Hyper-local eldercare directory where families and independent caregivers connect
                directly, discuss requirements, and coordinate care safely.
              </div>
            </div>

            <div>
              <div className="mb-2 px-4 text-xs font-extrabold tracking-normal text-[var(--brand)] uppercase">
                Platform
              </div>
              <div className="mt-1 flex w-full flex-wrap">
                <Link
                  href="/directory"
                  className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]"
                >
                  Directory
                </Link>
                <Link
                  href="/signup"
                  className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]"
                >
                  Sign Up
                </Link>
                <Link href="/chats" className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]">
                  Inbox
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-2 px-4 text-xs font-extrabold tracking-normal text-[var(--brand)] uppercase">
                Support
              </div>
              <div className="mt-1 flex w-full flex-wrap">
                <Link
                  href="/faq/families"
                  className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]"
                >
                  FAQ for Families
                </Link>
                <Link
                  href="/faq/caregivers"
                  className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]"
                >
                  FAQ for Caregivers
                </Link>
                <Link href="/login" className="w-full rounded-lg px-4 py-2 font-bold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]">
                  Login
                </Link>
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold tracking-normal text-[var(--brand)] uppercase">
                Platform Rules
              </div>
              <div className="mt-4 space-y-2 text-sm font-bold text-[var(--muted)]">
                <p>No auto-matching</p>
                <p>No built-in scheduling</p>
                <p>No wage payment gateway</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--line)] pt-5 text-center text-sm font-semibold text-[var(--muted)]">
            Copyright © {new Date().getFullYear()} Silver Directory. Families and caregivers
            coordinate directly.
          </div>
        </div>
      </Container>
    </footer>
  );
}
