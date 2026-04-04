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
    <header className="top-nav page-enter">
      <div className="flex w-full items-center justify-between gap-3 md:w-auto">
        <Link href="/" className="brand-chip" onClick={() => setMobileMenuOpen(false)}>
          <span className="brand-badge">SD</span>
          <span className="brand-name">Silver Directory</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((previous) => !previous)}
          className="menu-toggle md:hidden"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-site-nav"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      <nav className="nav-links hidden md:flex">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${isActivePath(pathname, item.href) ? "nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}

        {isAuthenticated && (
          <Link
            href="/chats"
            className={`nav-link ${isActivePath(pathname, "/chats") ? "nav-link-active" : ""}`}
          >
            Inbox
          </Link>
        )}

        {!isAuthenticated && (
          <>
            <Link
              href="/for-nurses"
              className={`nav-link ${isActivePath(pathname, "/for-nurses") ? "nav-link-active" : ""}`}
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className={`nav-link ${isActivePath(pathname, "/login") ? "nav-link-active" : ""}`}
            >
              Login
            </Link>
          </>
        )}

        {accountRole === "caregiver" && (
          <Link
            href="/caregiver/dashboard"
            className={`nav-link ${isActivePath(pathname, "/caregiver/dashboard") ? "nav-link-active" : ""}`}
          >
            Caregiver Dashboard
          </Link>
        )}
        {accountRole === "client" && (
          <Link
            href="/client/profile"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#cfdce8] bg-white text-[#28425f] transition hover:bg-[#edf3f7] ${
              isActivePath(pathname, "/client/profile") ? "ring-2 ring-[#0f766e]/40 ring-offset-2 ring-offset-white" : ""
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
        <nav id="mobile-site-nav" className="mobile-nav md:hidden">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-link ${isActivePath(pathname, item.href) ? "mobile-nav-link-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {isAuthenticated && (
            <Link
              href="/chats"
              className={`mobile-nav-link ${isActivePath(pathname, "/chats") ? "mobile-nav-link-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Inbox
            </Link>
          )}

          {!isAuthenticated && (
            <>
              <Link
                href="/for-nurses"
                className={`mobile-nav-link ${isActivePath(pathname, "/for-nurses") ? "mobile-nav-link-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
              <Link
                href="/login"
                className={`mobile-nav-link ${isActivePath(pathname, "/login") ? "mobile-nav-link-active" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            </>
          )}

          {accountRole === "caregiver" && (
            <Link
              href="/caregiver/dashboard"
              className={`mobile-nav-link ${isActivePath(pathname, "/caregiver/dashboard") ? "mobile-nav-link-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Caregiver Dashboard
            </Link>
          )}
          {accountRole === "client" && (
            <Link
              href="/client/profile"
              className={`mobile-nav-link ${isActivePath(pathname, "/client/profile") ? "mobile-nav-link-active" : ""}`}
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
