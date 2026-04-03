"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

export default function SiteHeader() {
  const supabase = getSupabaseBrowserClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      <Link href="/" className="brand-chip">
        <span className="brand-badge">SD</span>
        <span className="brand-name">Silver Directory</span>
      </Link>

      <nav className="nav-links">
        <Link href="/directory" className="nav-link">
          Look For a Caregiver
        </Link>
        <Link href="/faq/families" className="nav-link">
          FAQ for Families
        </Link>
        <Link href="/faq/caregivers" className="nav-link">
          FAQ for Caregivers
        </Link>

        {!isAuthenticated && (
          <>
            <Link href="/for-nurses" className="nav-link">
              Sign Up
            </Link>
            <Link href="/login" className="nav-link">
              Login
            </Link>
          </>
        )}

        {accountRole === "caregiver" && (
          <Link href="/caregiver/dashboard" className="nav-link">
            Caregiver Dashboard
          </Link>
        )}
        {accountRole === "client" && (
          <Link
            href="/client/profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#cfdce8] bg-white text-[#28425f] transition hover:bg-[#edf3f7]"
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
    </header>
  );
}
