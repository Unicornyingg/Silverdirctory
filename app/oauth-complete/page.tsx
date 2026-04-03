"use client";

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

      const { error: userUpsertError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? "",
          role,
        },
        { onConflict: "id" }
      );

      if (userUpsertError) {
        setErrorMessage(userUpsertError.message);
        return;
      }

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
      <section className="surface-panel page-enter p-6 text-sm text-[#54677f]">
        {errorMessage ? (
          <p className="text-red-700">{errorMessage}</p>
        ) : (
          <p>Finalizing your sign in...</p>
        )}
      </section>
    </div>
  );
}
