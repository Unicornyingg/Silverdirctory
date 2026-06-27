"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClientProfile, MarketplaceUser } from "@/lib/supabase/types";

type ClientForm = {
  fullName: string;
  phone: string;
  location: string;
};

const INITIAL_FORM: ClientForm = {
  fullName: "",
  phone: "",
  location: "",
};

function fallbackNameFromEmail(email: string | null | undefined): string {
  const localPart = (email ?? "").split("@")[0]?.trim();
  if (!localPart) return "Client";
  return localPart;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [isSetupMode, setIsSetupMode] = useState(false);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(
    null
  );
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(INITIAL_FORM);

  async function loadProfile(user: User) {
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, role, is_suspended, is_banned")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle();

    if (userError) {
      setErrorMessage(userError.message);
      return;
    }

    if (userRow?.is_banned || userRow?.is_suspended) {
      await supabase.auth.signOut();
      setErrorMessage(
        "Your account is currently restricted. Contact support if you believe this is a mistake."
      );
      return;
    }

    const role = (userRow?.role as MarketplaceUser["role"] | null) ?? "client";
    setAccountRole(role);
    if (role !== "client") {
      return;
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, user_id, full_name, phone, location, created_at, updated_at")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .returns<ClientProfile | null>();

    if (profileError) {
      setErrorMessage(profileError.message);
      return;
    }

    if (profileRow) {
      setForm({
        fullName: profileRow.full_name,
        phone: profileRow.phone ?? "",
        location: profileRow.location ?? "",
      });
      return;
    }

    setForm({
      fullName:
        (typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : "") || fallbackNameFromEmail(user.email),
      phone:
        typeof user.user_metadata.phone === "string"
          ? user.user_metadata.phone
          : "",
      location:
        typeof user.user_metadata.location === "string"
          ? user.user_metadata.location
          : "",
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const setupFlag = new URLSearchParams(window.location.search).get("setup") === "1";
    setIsSetupMode(setupFlag);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsBootLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (active) {
          setErrorMessage(error.message);
          setIsBootLoading(false);
        }
        return;
      }

      const user = data.session?.user ?? null;
      if (!user) {
        router.replace("/login?role=client&next=/client/profile");
        return;
      }

      if (!active) return;
      setAuthUser(user);
      await loadProfile(user);
      if (active) {
        setIsBootLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

  async function handleSignOut(redirectTo = "/login") {
    await supabase.auth.signOut();
    router.push(redirectTo);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!authUser) {
      setErrorMessage("Please sign in again.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    setIsSaving(true);
    try {
      const normalizedPhone = form.phone.trim() || null;
      const normalizedLocation = form.location.trim() || null;

      const { error: profileError } = await supabase.from("client_profiles").upsert(
        {
          user_id: authUser.id,
          full_name: form.fullName.trim(),
          phone: normalizedPhone,
          location: normalizedLocation,
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        setErrorMessage(profileError.message);
        return;
      }

      await supabase.auth.updateUser({
        data: {
          account_type: "client",
          full_name: form.fullName.trim(),
          phone: normalizedPhone,
          location: normalizedLocation,
        },
      });

      setAccountRole("client");
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save profile.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isBootLoading) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <section className="surface-panel page-enter p-6 text-sm text-[#54677f]">
          Loading your profile...
        </section>
      </div>
    );
  }

  if (accountRole !== "client") {
    return (
      <div className="site-shell">
        <SiteHeader />
        <section className="surface-panel page-enter p-6 text-sm text-[#344f6a]">
          <p className="text-base font-semibold text-[#10233b]">
            This page is only for family/client accounts.
          </p>
          <p className="mt-2">Sign in using your family account to edit profile details.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSignOut("/login?role=client&next=/client/profile")}
              className="primary-btn text-sm"
            >
              Sign in as family
            </button>
            <Link href="/directory" className="secondary-btn text-sm">
              Back to directory
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Client Profile</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Update your details
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              Keep this profile updated so caregivers can identify you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/chats" className="secondary-btn text-sm">
              Open inbox
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="secondary-btn text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      {isSetupMode && (
        <section className="surface-panel mt-6 border-[var(--line-strong)] bg-[#f7eef2] p-5 text-[var(--brand-strong)]">
          <h2 className="text-lg font-semibold">Welcome! Let&apos;s set up your profile.</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--brand)]">
            Share who you are and your preferred contact details so caregivers can recognize your
            requests quickly.
          </p>
        </section>
      )}

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="surface-panel mt-6 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      <main className="mt-6">
        <section className="surface-panel p-6 md:p-8">
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[#243d58]">Full name</span>
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, fullName: event.target.value }))
                }
                className="field-input"
                placeholder="Alex Tan"
                autoComplete="name"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Phone (optional)</span>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, phone: event.target.value }))
                }
                className="field-input"
                placeholder="+65 8123 4567"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Estate (optional)</span>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, location: event.target.value }))
                }
                className="field-input"
                placeholder="Bedok"
                autoComplete="address-level2"
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="primary-btn md:col-span-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
