"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

const NAV_LINKS = [
  { href: "/directory", label: "Look For a Caregiver" },
  { href: "/faq/families", label: "FAQ for Families" },
  { href: "/faq/caregivers", label: "FAQ for Caregivers" },
] as const;

const desktopPillClass =
  "inline-flex items-center rounded-full border border-warm-border/95 bg-warm-surface-soft px-3.5 py-2 text-[0.82rem] font-bold text-warm-muted transition hover:-translate-y-px hover:border-sage-500/40 hover:text-warm-ink";

const desktopPillActiveClass = "border-sage-500/50 bg-sage-100 text-sage-600 shadow-sm";

const mobilePillClass =
  "rounded-xl border border-warm-border bg-warm-surface px-3 py-2.5 text-[0.88rem] font-semibold text-warm-muted transition hover:border-sage-500/35 hover:text-warm-ink";

const mobilePillActiveClass = "border-sage-500/45 bg-sage-100 text-sage-600";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const supabase = getSupabaseBrowserClient();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(
    null
  );

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
    <header className="page-enter sticky top-3 z-40 mb-7 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-warm-border/90 bg-warm-surface/90 p-2 shadow-soft backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 md:w-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-full border border-warm-border bg-warm-surface-soft px-4 py-2 shadow-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-sage-500 to-sage-600 text-[0.73rem] font-extrabold tracking-[0.02em] text-white">
            SD
          </span>
          <span className="font-display text-[0.95rem] font-semibold tracking-[0.01em] text-warm-ink">
            Silver Directory
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="rounded-full border border-warm-border bg-warm-surface-soft px-4 py-2 text-[0.82rem] font-bold text-warm-muted transition hover:border-sage-500/40 hover:text-warm-ink md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-site-nav"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      <nav className="hidden flex-wrap items-center gap-2 md:flex">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${desktopPillClass} ${isActivePath(pathname, item.href) ? desktopPillActiveClass : ""}`}
          >
            {item.label}
          </Link>
        ))}

        {isAuthenticated && (
          <Link
            href="/chats"
            className={`${desktopPillClass} ${isActivePath(pathname, "/chats") ? desktopPillActiveClass : ""}`}
          >
            Inbox
          </Link>
        )}

        {!isAuthenticated && (
          <>
            <Link
              href="/for-nurses"
              className={`${desktopPillClass} ${isActivePath(pathname, "/for-nurses") ? desktopPillActiveClass : ""}`}
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className={`${desktopPillClass} ${isActivePath(pathname, "/login") ? desktopPillActiveClass : ""}`}
            >
              Login
            </Link>
          </>
        )}

        {accountRole === "caregiver" && (
          <Link
            href="/caregiver/dashboard"
            className={`${desktopPillClass} ${isActivePath(pathname, "/caregiver/dashboard") ? desktopPillActiveClass : ""}`}
          >
            Caregiver Dashboard
          </Link>
        )}
        {accountRole === "client" && (
          <Link
            href="/client/profile"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-warm-border bg-warm-surface-soft text-warm-muted shadow-sm transition hover:border-sage-500/35 hover:text-warm-ink ${
              isActivePath(pathname, "/client/profile")
                ? "ring-2 ring-sage-500/35 ring-offset-2 ring-offset-warm-surface"
                : ""
            }`}
            aria-label="Client profile"
            title="Client profile"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
        )}
      </nav>

      {mobileMenuOpen && (
        <nav
          id="mobile-site-nav"
          className="grid w-full gap-2 rounded-card border border-warm-border bg-warm-surface-soft p-3 shadow-soft md:hidden"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${mobilePillClass} ${isActivePath(pathname, item.href) ? mobilePillActiveClass : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {isAuthenticated && (
            <Link
              href="/chats"
              className={`${mobilePillClass} ${isActivePath(pathname, "/chats") ? mobilePillActiveClass : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Inbox
            </Link>
          )}

          {!isAuthenticated && (
            <>
              <Link
                href="/for-nurses"
                className={`${mobilePillClass} ${isActivePath(pathname, "/for-nurses") ? mobilePillActiveClass : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className={`${mobilePillClass} ${isActivePath(pathname, "/login") ? mobilePillActiveClass : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            </>
          )}

          {accountRole === "caregiver" && (
            <Link
              href="/caregiver/dashboard"
              className={`${mobilePillClass} ${
                isActivePath(pathname, "/caregiver/dashboard") ? mobilePillActiveClass : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Caregiver Dashboard
            </Link>
          )}
          {accountRole === "client" && (
            <Link
              href="/client/profile"
              className={`${mobilePillClass} ${
                isActivePath(pathname, "/client/profile") ? mobilePillActiveClass : ""
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Client Profile
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
