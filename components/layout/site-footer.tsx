import Link from "next/link";
import { Container } from "@/components/landing/Container";

export function SiteFooter() {
  return (
    <div className="relative mt-14">
      <Container>
        <div className="home-section-surface mx-auto max-w-screen-xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center space-x-2 text-2xl font-medium text-indigo-600">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-sm font-bold text-white">
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
              <div className="mb-2 px-4 text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
                Platform
              </div>
              <div className="mt-1 flex w-full flex-wrap">
                <Link
                  href="/directory"
                  className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Directory
                </Link>
                <Link
                  href="/signup"
                  className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Sign Up
                </Link>
                <Link href="/chats" className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                  Inbox
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-2 px-4 text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
                Support
              </div>
              <div className="mt-1 flex w-full flex-wrap">
                <Link
                  href="/faq/families"
                  className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  FAQ for Families
                </Link>
                <Link
                  href="/faq/caregivers"
                  className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  FAQ for Caregivers
                </Link>
                <Link href="/login" className="w-full rounded-md px-4 py-2 text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-600">
                  Login
                </Link>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold tracking-[0.12em] text-gray-500 uppercase">
                Platform Rules
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <p>No auto-matching</p>
                <p>No built-in scheduling</p>
                <p>No wage payment gateway</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--line)] pt-5 text-center text-sm text-gray-600">
            Copyright © {new Date().getFullYear()} Silver Directory. Families and caregivers
            coordinate directly.
          </div>
        </div>
      </Container>
    </div>
  );
}
