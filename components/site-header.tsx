"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

const NAV_LINKS = [
  { href: "/directory", label: "Directory" },
  { href: "/faq/families", label: "Families FAQ" },
  { href: "/faq/caregivers", label: "Caregivers FAQ" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const supabase = getSupabaseBrowserClient();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAuthState() {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setIsAuthenticated(false);
        setAccountRole(null);
        return;
      }

      const user = sessionData.session?.user ?? null;
      if (!user) {
        setIsAuthenticated(false);
        setAccountRole(null);
        return;
      }

      setIsAuthenticated(true);
      const { data: appUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;
      setAccountRole((appUser?.role as MarketplaceUser["role"] | null) ?? null);
    }

    void loadAuthState();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <div className="w-full">
      <nav className="container relative mx-auto flex flex-wrap items-center justify-between p-8 lg:justify-between xl:px-1">
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          <span className="flex items-center space-x-2 text-2xl font-medium text-indigo-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-sm font-bold text-white">
              SD
            </span>
            <span>Silver Directory</span>
          </span>
        </Link>

        <div className="mr-2 ml-auto flex gap-3 lg:order-2 lg:ml-0">
          <Link
            href="/directory"
            className="primary-btn hidden min-h-[2.5rem] px-6 py-2 text-sm md:ml-5 lg:flex"
          >
            Browse Caregivers
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle Menu"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="rounded-md px-2 py-1 text-gray-700 hover:text-indigo-700 focus:bg-indigo-100 focus:text-indigo-700 focus:outline-none lg:hidden"
        >
          <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {mobileMenuOpen ? (
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
              />
            )}
          </svg>
        </button>

        <div className="hidden text-center lg:flex lg:items-center">
          <ul className="flex flex-1 items-center justify-end pt-6 lg:pt-0">
            {NAV_LINKS.map((item) => (
              <li key={item.href} className="mr-3">
                <Link
                  href={item.href}
                  className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 focus:bg-indigo-100 focus:text-indigo-500 focus:outline-none ${
                    isActivePath(pathname, item.href) ? "text-indigo-600" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {isAuthenticated ? (
              <>
                <li className="mr-3">
                  <Link
                    href="/chats"
                    className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 ${
                      isActivePath(pathname, "/chats") ? "text-indigo-600" : "text-gray-800"
                    }`}
                  >
                    Inbox
                  </Link>
                </li>
                {accountRole === "caregiver" ? (
                  <li className="mr-3">
                    <Link
                      href="/caregiver/dashboard"
                      className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 ${
                        isActivePath(pathname, "/caregiver/dashboard")
                          ? "text-indigo-600"
                          : "text-gray-800"
                      }`}
                    >
                      Dashboard
                    </Link>
                  </li>
                ) : null}
                {accountRole === "client" ? (
                  <li className="mr-3">
                    <Link
                      href="/client/profile"
                      className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 ${
                        isActivePath(pathname, "/client/profile")
                          ? "text-indigo-600"
                          : "text-gray-800"
                      }`}
                    >
                      Profile
                    </Link>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li className="mr-3">
                  <Link
                    href="/for-nurses"
                    className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 ${
                      isActivePath(pathname, "/for-nurses") ? "text-indigo-600" : "text-gray-800"
                    }`}
                  >
                    Sign Up
                  </Link>
                </li>
                <li className="mr-3">
                  <Link
                    href="/login"
                    className={`inline-block rounded-md px-4 py-2 text-lg font-normal no-underline transition hover:text-indigo-500 ${
                      isActivePath(pathname, "/login") ? "text-indigo-600" : "text-gray-800"
                    }`}
                  >
                    Login
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {mobileMenuOpen ? (
          <div className="my-5 flex w-full flex-wrap lg:hidden">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`-ml-4 w-full rounded-md px-4 py-2 ${
                  isActivePath(pathname, item.href)
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-700 hover:text-indigo-700"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <Link
                  href="/chats"
                  className={`-ml-4 w-full rounded-md px-4 py-2 ${
                    isActivePath(pathname, "/chats")
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:text-indigo-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inbox
                </Link>
                {accountRole === "caregiver" ? (
                  <Link
                    href="/caregiver/dashboard"
                    className={`-ml-4 w-full rounded-md px-4 py-2 ${
                      isActivePath(pathname, "/caregiver/dashboard")
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-700 hover:text-indigo-700"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : null}
                {accountRole === "client" ? (
                  <Link
                    href="/client/profile"
                    className={`-ml-4 w-full rounded-md px-4 py-2 ${
                      isActivePath(pathname, "/client/profile")
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-gray-700 hover:text-indigo-700"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <Link
                  href="/for-nurses"
                  className={`-ml-4 w-full rounded-md px-4 py-2 ${
                    isActivePath(pathname, "/for-nurses")
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:text-indigo-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className={`-ml-4 w-full rounded-md px-4 py-2 ${
                    isActivePath(pathname, "/login")
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:text-indigo-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </>
            )}

            <Link
              href="/directory"
              className="primary-btn mt-3 w-full text-center text-sm"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Caregivers
            </Link>
          </div>
        ) : null}
      </nav>
    </div>
  );
}
