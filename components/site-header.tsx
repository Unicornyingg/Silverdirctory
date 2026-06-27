"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

const NAV_LINKS = [
  { href: "/directory", label: "Browse Caregivers" },
  { href: "/care-forum", label: "Care Forum" },
  { href: "/faq/families", label: "Families FAQ" },
  { href: "/faq/caregivers", label: "Caregivers FAQ" },
] as const;

type SiteHeaderProps = {
  /** "overlay" renders a transparent nav that sits on top of a hero photo. */
  variant?: "default" | "overlay";
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const supabase = getSupabaseBrowserClient();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(null);

  const isOverlay = variant === "overlay";

  // Variant-aware class fragments.
  const navClass = isOverlay
    ? "container relative mx-auto mt-3 flex max-w-7xl flex-wrap items-center justify-between rounded-full px-4 py-3 text-white sm:px-5 lg:px-6"
    : "container relative mx-auto mt-3 flex max-w-7xl flex-wrap items-center justify-between rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-3 shadow-[var(--shadow-soft)] sm:px-5 lg:justify-between lg:px-6";

  const logoTextClass = isOverlay ? "text-white" : "text-[var(--foreground)]";
  const logoBadgeClass = isOverlay
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/90 p-1.5"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-white p-1.5 shadow-sm";

  const toggleClass = isOverlay
    ? "rounded-full px-2 py-1 text-white hover:text-white/80 focus:bg-white/20 focus:text-white focus:outline-none lg:hidden"
    : "rounded-full px-2 py-1 text-[var(--brand)] hover:text-[var(--brand-strong)] focus:bg-[var(--accent-soft)] focus:text-[var(--brand-strong)] focus:outline-none lg:hidden";

  const linkBase = "inline-block rounded-full px-3 py-2 text-sm no-underline transition xl:px-4";
  const linkActive = isOverlay
    ? "bg-white/20 font-extrabold text-white"
    : "bg-[var(--accent-soft)] font-extrabold text-[var(--brand)]";
  const linkIdle = isOverlay
    ? "font-bold text-white/85 hover:bg-white/15 hover:text-white"
    : "font-bold text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--brand)]";

  const signupClass = isOverlay
    ? "inline-block rounded-full border border-white/70 px-4 py-2 text-sm font-extrabold text-white no-underline transition hover:bg-white/15"
    : isActivePath(pathname, "/signup")
      ? "inline-block rounded-full border border-[var(--btn-secondary-border)] bg-[var(--signal)] px-4 py-2 text-sm font-extrabold text-[var(--brand)] no-underline transition hover:text-[var(--brand-strong)]"
      : "inline-block rounded-full border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--brand)] no-underline transition hover:bg-[var(--signal)] hover:text-[var(--brand-strong)]";

  const mobilePanelClass = isOverlay
    ? "my-5 flex w-full flex-col gap-1 rounded-2xl bg-[var(--brand-strong)] p-2 lg:hidden"
    : "my-5 flex w-full flex-col gap-1 px-4 lg:hidden";
  const mobileLinkBase = "w-full rounded-lg px-4 py-2 transition";

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
      <nav className={navClass}>
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>
          <span className={`flex items-center space-x-2.5 font-display text-xl font-semibold ${logoTextClass}`}>
            <span className={logoBadgeClass}>
              <Image
                src="/images/silver-directory-logo.png"
                alt="Silver Directory logo"
                width={40}
                height={36}
                className="h-full w-full object-contain"
                priority={isOverlay}
              />
            </span>
            <span>Silver Directory</span>
          </span>
        </Link>

        <div className="mr-2 ml-auto flex gap-3 lg:hidden" />

        <button
          type="button"
          aria-label="Toggle Menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className={toggleClass}
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

        <div className="hidden min-w-0 flex-1 text-center lg:ml-4 lg:flex lg:items-center lg:justify-end">
          <ul className="flex min-w-0 flex-wrap items-center justify-end gap-1 pt-6 lg:pt-0">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${linkBase} ${isActivePath(pathname, item.href) ? linkActive : linkIdle}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {isAuthenticated ? (
              <>
                <li>
                  <Link
                    href="/chats"
                    className={`${linkBase} ${isActivePath(pathname, "/chats") ? linkActive : linkIdle}`}
                  >
                    Inbox
                  </Link>
                </li>
                {accountRole === "caregiver" ? (
                  <li>
                    <Link
                      href="/caregiver/dashboard"
                      className={`${linkBase} ${isActivePath(pathname, "/caregiver/dashboard") ? linkActive : linkIdle}`}
                    >
                      Dashboard
                    </Link>
                  </li>
                ) : null}
                {accountRole === "client" ? (
                  <li>
                    <Link
                      href="/client/profile"
                      className={`${linkBase} ${isActivePath(pathname, "/client/profile") ? linkActive : linkIdle}`}
                    >
                      Profile
                    </Link>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li>
                  <Link href="/signup" className={signupClass}>
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className={`${linkBase} ${isActivePath(pathname, "/login") ? linkActive : linkIdle}`}
                  >
                    Login
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-navigation" className={mobilePanelClass}>
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${mobileLinkBase} ${isActivePath(pathname, item.href) ? linkActive : linkIdle}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <Link
                  href="/chats"
                  className={`${mobileLinkBase} ${isActivePath(pathname, "/chats") ? linkActive : linkIdle}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inbox
                </Link>
                {accountRole === "caregiver" ? (
                  <Link
                    href="/caregiver/dashboard"
                    className={`${mobileLinkBase} ${isActivePath(pathname, "/caregiver/dashboard") ? linkActive : linkIdle}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : null}
                {accountRole === "client" ? (
                  <Link
                    href="/client/profile"
                    className={`${mobileLinkBase} ${isActivePath(pathname, "/client/profile") ? linkActive : linkIdle}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className={`${mobileLinkBase} text-left ${linkIdle}`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className={`${mobileLinkBase} ${isActivePath(pathname, "/signup") ? linkActive : linkIdle}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className={`${mobileLinkBase} ${isActivePath(pathname, "/login") ? linkActive : linkIdle}`}
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
