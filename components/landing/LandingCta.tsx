"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MarketplaceUser } from "@/lib/supabase/types";

type AccountRole = MarketplaceUser["role"] | null;

/**
 * Renders the two hero CTA buttons.
 * When the user is logged in the signup/browse CTAs are replaced
 * with contextual links that match the user's role.
 */
export function HeroCta() {
  const { isAuthenticated, accountRole } = useAuthState();

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <Link
          href="/directory"
          className="primary-btn w-full px-8 py-4 text-center text-lg sm:w-auto"
        >
          Browse Directory
        </Link>
        {accountRole === "caregiver" ? (
          <Link
            href="/caregiver/dashboard"
            className="secondary-btn w-full px-8 py-4 text-center text-lg sm:w-auto"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/client/profile"
            className="secondary-btn w-full px-8 py-4 text-center text-lg sm:w-auto"
          >
            My Profile
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
      <Link
        href="/directory"
        className="primary-btn w-full px-8 py-4 text-center text-lg sm:w-auto"
      >
        Find a Caregiver
      </Link>
      <Link
        href="/signup"
        className="secondary-btn w-full px-8 py-4 text-center text-lg sm:w-auto"
      >
        List Your Care Services
      </Link>
    </div>
  );
}

/**
 * Renders the bottom-of-page CTA banner buttons.
 * Logged-in users see role-appropriate links instead of signup prompts.
 */
export function BannerCta() {
  const { isAuthenticated, accountRole } = useAuthState();

  if (isAuthenticated) {
    return (
      <div className="flex w-full flex-shrink-0 flex-col gap-3 text-center sm:flex-row sm:justify-center lg:w-auto lg:justify-end">
        <Link
          href="/directory"
          className="secondary-btn mx-auto inline-block w-full border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 sm:w-auto lg:px-10 lg:py-5"
        >
          Browse Directory
        </Link>
        {accountRole === "caregiver" ? (
          <Link
            href="/caregiver/dashboard"
            className="secondary-btn mx-auto inline-block w-full border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 sm:w-auto lg:px-10 lg:py-5"
          >
            Go to Dashboard
          </Link>
        ) : (
          <Link
            href="/chats"
            className="secondary-btn mx-auto inline-block w-full border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 sm:w-auto lg:px-10 lg:py-5"
          >
            My Inbox
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-shrink-0 flex-col gap-3 text-center sm:flex-row sm:justify-center lg:w-auto lg:justify-end">
      <Link
        href="/directory"
        className="secondary-btn mx-auto inline-block w-full border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 sm:w-auto lg:px-10 lg:py-5"
      >
        Browse Caregivers
      </Link>
      <Link
        href="/for-nurses"
        className="secondary-btn mx-auto inline-block w-full border-[var(--line)] bg-[var(--panel-strong)] px-7 py-3 text-center text-lg font-semibold text-indigo-700 hover:text-indigo-800 sm:w-auto lg:px-10 lg:py-5"
      >
        I&apos;m a Caregiver - Get Listed
      </Link>
    </div>
  );
}

/** Shared hook — reads Supabase session + role from the browser client. */
function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountRole, setAccountRole] = useState<AccountRole>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function load() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session?.user) {
        setIsAuthenticated(false);
        setAccountRole(null);
        return;
      }

      setIsAuthenticated(true);

      const { data: appUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.session.user.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;
      setAccountRole((appUser?.role as AccountRole) ?? null);
    }

    void load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, accountRole };
}
