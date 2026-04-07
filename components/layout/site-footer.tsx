import Link from "next/link";
import { Container } from "@/components/landing/Container";

export function SiteFooter() {
  return (
    <div className="relative mt-10 border-t border-[var(--line)]">
      <Container>
        <div className="mx-auto mt-5 grid max-w-screen-xl grid-cols-1 gap-10 pt-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 text-2xl font-medium text-indigo-600">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-sm font-bold text-white">
                SD
              </span>
              <span>Silver Directory</span>
            </Link>

            <div className="mt-4 max-w-md text-gray-700">
              Hyper-local eldercare directory where families and independent caregivers connect
              directly, discuss requirements, and coordinate care safely.
            </div>
          </div>

          <div>
            <div className="-ml-3 -mt-2 flex w-full flex-wrap lg:ml-0">
              <Link
                href="/directory"
                className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500"
              >
                Directory
              </Link>
              <Link
                href="/for-nurses"
                className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500"
              >
                Caregiver Signup
              </Link>
              <Link href="/chats" className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500">
                Inbox
              </Link>
            </div>
          </div>

          <div>
            <div className="-ml-3 -mt-2 flex w-full flex-wrap lg:ml-0">
              <Link
                href="/faq/families"
                className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500"
              >
                FAQ for Families
              </Link>
              <Link
                href="/faq/caregivers"
                className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500"
              >
                FAQ for Caregivers
              </Link>
              <Link href="/login" className="w-full rounded-md px-4 py-2 text-gray-700 hover:text-indigo-500">
                Login
              </Link>
            </div>
          </div>

          <div>
            <div className="text-gray-900">Platform Rules</div>
            <div className="mt-5 space-y-2 text-sm text-gray-700">
              <p>No auto-matching</p>
              <p>No built-in scheduling</p>
              <p>No wage payment gateway</p>
            </div>
          </div>
        </div>

        <div className="my-10 text-center text-sm text-gray-700">
          Copyright © {new Date().getFullYear()} Silver Directory. Families and caregivers
          coordinate directly.
        </div>
      </Container>
    </div>
  );
}
