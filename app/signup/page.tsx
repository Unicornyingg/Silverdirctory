"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { enforceAuthAttemptLimit } from "@/lib/security/auth-attempt-client";
import { getReadableAuthError } from "@/lib/supabase/auth-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_FULL_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 128;

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        router.replace("/client/profile?setup=1");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleFamilySignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (normalizedName.length > MAX_FULL_NAME_LENGTH) {
      setErrorMessage("Full name is too long.");
      return;
    }
    if (normalizedEmail.length < 4 || !normalizedEmail.includes("@")) {
      setErrorMessage("Please enter a valid email.");
      return;
    }
    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      setErrorMessage("Email is too long.");
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
    if (password !== confirmPassword) {
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await enforceAuthAttemptLimit("client_signup");
      const supabase = getSupabaseBrowserClient();
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            account_type: "client",
            full_name: normalizedName,
          },
        },
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
        return;
      }

      // If email confirmation is enabled, session will be null — tell the user to check their inbox.
      if (!signUpData.session) {
        setStatusMessage(
          "Almost there! Check your email inbox and click the confirmation link to activate your account."
        );
        return;
      }

      setStatusMessage("Family account created. Redirecting to profile setup...");
      router.push("/client/profile?setup=1");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? getReadableAuthError(error) : "Unable to create account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <p className="eyebrow">Account Creation</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
          Choose your account type
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#56677c]">
          Families can sign up directly here. Caregivers continue to the caregiver onboarding flow.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#d8e3eb] bg-white/92 p-5 shadow-[0_10px_28px_rgba(15,36,58,0.08)]">
            <h2 className="text-xl font-bold text-[#10233b]">I&apos;m a Family</h2>
            <p className="mt-2 text-sm text-[#56677c]">
              Browse caregiver profiles and start secure in-app chats.
            </p>

            <form onSubmit={handleFamilySignup} className="mt-5 space-y-3">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-[#243d58]">Full name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="field-input"
                  placeholder="Jane Smith"
                  autoComplete="name"
                  maxLength={MAX_FULL_NAME_LENGTH}
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-[#243d58]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input"
                  placeholder="you@email.com"
                  autoComplete="email"
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-[#243d58]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field-input"
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-[#243d58]">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="field-input"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="primary-btn mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create family account"}
              </button>
            </form>

            <p className="mt-4 text-xs text-[#5d6d81]">
              Already registered?{" "}
              <Link href="/login?role=client" className="font-semibold text-[#1f6b93]">
                Sign in
              </Link>
            </p>
          </article>

          <article className="rounded-2xl border border-[#d8e3eb] bg-white/92 p-5 shadow-[0_10px_28px_rgba(15,36,58,0.08)]">
            <h2 className="text-xl font-bold text-[#10233b]">I&apos;m a Caregiver</h2>
            <p className="mt-2 text-sm text-[#56677c]">
              Create your listing, verify your phone number, and set up your caregiver profile.
            </p>

            <Link href="/for-nurses" className="primary-btn mt-5 inline-flex w-full justify-center">
              Create caregiver account
            </Link>

            <p className="mt-4 text-xs text-[#5d6d81]">
              Already registered?{" "}
              <Link href="/login?role=caregiver" className="font-semibold text-[#1f6b93]">
                Sign in
              </Link>
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
