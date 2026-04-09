"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function normalizeRole(input: string | null): "client" | "caregiver" | null {
  if (input === "caregiver") return "caregiver";
  if (input === "client") return "client";
  return null;
}

function getSafeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null;
  return trimmed;
}

export default function OAuthCompletePage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const params = new URLSearchParams(window.location.search);
      const requestedRole = normalizeRole(params.get("role"));
      const nextPath = getSafeNextPath(params.get("next"));

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const user = data.session?.user;
      if (!user) {
        setErrorMessage("Login session was not found. Please try signing in again.");
        return;
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("role, is_suspended, is_banned")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      const existingRole =
        existingUser?.role === "caregiver" ||
        existingUser?.role === "client" ||
        existingUser?.role === "admin"
          ? existingUser.role
          : null;

      if (requestedRole === "caregiver" || existingRole === "caregiver") {
        await supabase.auth.signOut();
        setErrorMessage(
          "Offering care accounts must sign in with email/password."
        );
        return;
      }

      if (existingUser?.is_banned || existingUser?.is_suspended) {
        await supabase.auth.signOut();
        setErrorMessage(
          "Your account is currently restricted. Contact support if you believe this is a mistake."
        );
        return;
      }

      const role = existingRole === "admin" ? "admin" : "client";

      await supabase.auth.updateUser({
        data: {
          account_type: role,
        },
      });

      router.replace(nextPath ?? "/directory");
    })();
  }, [router]);

  return (
    <div className="site-shell">
      <SiteHeader />
      <section className="surface-panel page-enter flex flex-col items-center gap-3 p-6 text-center text-sm text-[#54677f]">
        {errorMessage ? (
          <>
            <p role="alert" aria-live="assertive" className="text-red-700">
              {errorMessage}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/login?role=client" className="primary-btn text-sm">
                Try family sign in
              </Link>
              <Link href="/login" className="secondary-btn text-sm">
                Back to login
              </Link>
            </div>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
            />
            <p>Finalizing your sign in...</p>
            <p className="text-xs text-[#5d718a]">This usually takes a moment.</p>
          </>
        )}
      </section>
    </div>
  );
}
