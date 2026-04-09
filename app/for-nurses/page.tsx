"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import OnboardingStepper from "@/components/onboarding-stepper";
import SiteHeader from "@/components/site-header";
import { saveCaregiverSignupContext } from "@/lib/caregiver-signup-context";
import { normalizePhoneForAuth } from "@/lib/phone-format";
import { enforceAuthAttemptLimit } from "@/lib/security/auth-attempt-client";
import { getReadableAuthError } from "@/lib/supabase/auth-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SignupForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM: SignupForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const MAX_FULL_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 24;
const MAX_PASSWORD_LENGTH = 128;

export default function CaregiverAccountCreationPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const user = data.session?.user;
      if (!user) return;

      const { data: appUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (appUser?.role === "caregiver") {
        router.replace("/caregiver/dashboard");
      } else {
        router.replace("/directory");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = normalizePhoneForAuth(form.phone);
    const password = form.password;
    const confirmPassword = form.confirmPassword ?? "";

    if (fullName.length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (fullName.length > MAX_FULL_NAME_LENGTH) {
      setErrorMessage("Full name is too long.");
      return;
    }
    if (email.length < 4 || !email.includes("@")) {
      setErrorMessage("Please enter a valid email.");
      return;
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      setErrorMessage("Email is too long.");
      return;
    }
    if (phone.length < 6) {
      setErrorMessage("Please enter your phone number.");
      return;
    }
    if (phone.length > MAX_PHONE_LENGTH) {
      setErrorMessage("Phone number is too long.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH || confirmPassword.length > MAX_PASSWORD_LENGTH) {
      setErrorMessage("Password is too long.");
      return;
    }
    if (confirmPassword !== password) {
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await enforceAuthAttemptLimit("caregiver_signup");
      const supabase = getSupabaseBrowserClient();
      const metadata = {
        account_type: "caregiver" as const,
        onboarding_stage: "account_created",
        full_name: fullName,
        contact_email: email,
        phone,
      };

      const { error } = await supabase.auth.signUp({
        phone,
        password,
        options: {
          channel: "sms",
          data: metadata,
        },
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
        return;
      }

      saveCaregiverSignupContext({
        fullName,
        email,
        phone,
        createdAt: Date.now(),
      });

      setStatusMessage(`SMS code sent to ${phone}. Redirecting to verification...`);
      router.push(`/for-nurses/verify-otp?phone=${encodeURIComponent(phone)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create account right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="page-enter">
        <section className="surface-panel mx-auto max-w-2xl p-6 md:p-8">
          <p className="eyebrow">Caregiver Onboarding</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
            Create your caregiver account
          </h1>
          <OnboardingStepper currentStep={1} className="mt-4" />
          <p className="mt-2 text-sm leading-6 text-[#56677c]">
            Stage 1 of 3: account creation. You will verify your phone next, then complete your
            caregiver profile setup.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Full name</span>
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, fullName: event.target.value }))
                }
                className="field-input"
                placeholder="Jane Smith"
                autoComplete="name"
                maxLength={MAX_FULL_NAME_LENGTH}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, email: event.target.value }))
                }
                className="field-input"
                placeholder="jane@domain.com"
                autoComplete="email"
                maxLength={MAX_EMAIL_LENGTH}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Phone number</span>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, phone: event.target.value }))
                }
                className="field-input"
                placeholder="8123 4567"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={MAX_PHONE_LENGTH}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, password: event.target.value }))
                }
                className="field-input"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                minLength={8}
                maxLength={MAX_PASSWORD_LENGTH}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Confirm password</span>
              <input
                type="password"
                value={form.confirmPassword ?? ""}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    confirmPassword: event.target.value,
                  }))
                }
                className="field-input"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                minLength={8}
                maxLength={MAX_PASSWORD_LENGTH}
                required
              />
            </label>

            {errorMessage && (
              <p
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            {statusMessage && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                {statusMessage}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d8e3eb] pt-4">
              <p className="text-xs leading-5 text-[#5d6d81]">
                Already have an account?{" "}
                <Link href="/login?role=caregiver" className="font-semibold text-[#1f6b93]">
                  Sign in
                </Link>
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="primary-btn w-full sm:min-w-[220px] sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending OTP..." : "Continue to phone verification"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
