"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

const NAV_LINKS = [
  { href: "/directory", label: "Browse Caregivers" },
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
  const router = useRouter();
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeMenu = () => setMobileMenuOpen(false);
    window.addEventListener("popstate", closeMenu);
    return () => {
      window.removeEventListener("popstate", closeMenu);
    };
  }, [mobileMenuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/login");
  }

  return (
    <div className="w-full">
      <nav className="container relative mx-auto flex flex-wrap items-center justify-between px-4 py-4 sm:px-6 lg:justify-between lg:px-8 lg:py-5 xl:px-10">
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          <span className="flex items-center space-x-2.5 font-display text-2xl font-semibold text-[var(--foreground)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-semibold text-[#f8f4ec]">
              SD
            </span>
            <span>Silver Directory</span>
          </span>
        </Link>

        <div className="mr-2 ml-auto flex gap-3 lg:order-2 lg:ml-0" />

        <button
          type="button"
          aria-label="Toggle Menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="rounded-md px-2 py-1 text-gray-700 hover:text-[var(--brand-strong)] focus:bg-[var(--accent-soft)] focus:text-[var(--brand-strong)] focus:outline-none lg:hidden"
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
              <li key={item.href} className="mr-1 xl:mr-2">
                <Link
                  href={item.href}
                  className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] focus:bg-[var(--accent-soft)] focus:text-[var(--brand)] focus:outline-none xl:px-4 xl:text-lg ${
                    isActivePath(pathname, item.href)
                      ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                      : "font-normal text-gray-800"
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
                    className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] xl:px-4 xl:text-lg ${
                      isActivePath(pathname, "/chats")
                        ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                        : "font-normal text-gray-800"
                    }`}
                  >
                    Inbox
                  </Link>
                </li>
                {accountRole === "caregiver" ? (
                  <li className="mr-1 xl:mr-2">
                    <Link
                      href="/caregiver/dashboard"
                      className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] xl:px-4 xl:text-lg ${
                        isActivePath(pathname, "/caregiver/dashboard")
                          ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                          : "font-normal text-gray-800"
                      }`}
                    >
                      Dashboard
                    </Link>
                  </li>
                ) : null}
                {accountRole === "client" ? (
                  <li className="mr-1 xl:mr-2">
                    <Link
                      href="/client/profile"
                      className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] xl:px-4 xl:text-lg ${
                        isActivePath(pathname, "/client/profile")
                          ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                          : "font-normal text-gray-800"
                      }`}
                    >
                      Profile
                    </Link>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li className="mr-1 xl:mr-2">
                  <Link
                    href="/signup"
                    className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] xl:px-4 xl:text-lg ${
                      isActivePath(pathname, "/signup")
                        ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                        : "font-normal text-gray-800"
                    }`}
                  >
                    Sign Up
                  </Link>
                </li>
                <li className="mr-1 xl:mr-2">
                  <Link
                    href="/login"
                    className={`inline-block rounded-md px-3 py-2 text-base no-underline transition hover:text-[var(--brand)] xl:px-4 xl:text-lg ${
                      isActivePath(pathname, "/login")
                        ? "font-semibold text-[var(--brand-strong)] underline decoration-2 underline-offset-8"
                        : "font-normal text-gray-800"
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
          <div id="mobile-navigation" className="my-5 flex w-full flex-col gap-1 px-4 lg:hidden">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full rounded-md px-4 py-2 transition ${
                  isActivePath(pathname, item.href)
                    ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                    : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
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
                  className={`w-full rounded-md px-4 py-2 transition ${
                    isActivePath(pathname, "/chats")
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                      : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inbox
                </Link>
                {accountRole === "caregiver" ? (
                  <Link
                    href="/caregiver/dashboard"
                    className={`w-full rounded-md px-4 py-2 transition ${
                      isActivePath(pathname, "/caregiver/dashboard")
                        ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                        : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : null}
                {accountRole === "client" ? (
                  <Link
                    href="/client/profile"
                    className={`w-full rounded-md px-4 py-2 transition ${
                      isActivePath(pathname, "/client/profile")
                        ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                        : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full rounded-md px-4 py-2 text-left text-gray-700 transition hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className={`w-full rounded-md px-4 py-2 transition ${
                    isActivePath(pathname, "/signup")
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                      : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className={`w-full rounded-md px-4 py-2 transition ${
                    isActivePath(pathname, "/login")
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--brand-strong)]"
                      : "text-gray-700 hover:bg-[var(--accent-soft)] hover:text-[var(--brand-strong)]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              </>
            )}

          </div>
        ) : null}
      </nav>
    </div>
  );
}
