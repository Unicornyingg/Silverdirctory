"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY" || !!session) {
          setIsReady(true);
          setErrorMessage(null);
        }
      }
    );

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      if (data.session) {
        setIsReady(true);
      } else {
        setErrorMessage(
          "This reset link is invalid or expired. Request a new reset link from login."
        );
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      router.replace("/login?status=password-reset");
      return;
    }

    const timer = window.setTimeout(() => {
      setRedirectCountdown((previous) => {
        if (previous === null) return null;
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [redirectCountdown, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRedirectCountdown(null);

    if (!isReady) {
      setErrorMessage("Reset session is not ready. Open the email link again.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Password updated successfully.");
      await supabase.auth.signOut();
      setRedirectCountdown(3);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update password.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="mx-auto max-w-xl">
        <section className="surface-panel page-enter p-6 md:p-8">
          <p className="eyebrow">Password Recovery</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b]">
            Set a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#56677c]">
            Enter your new password to complete account recovery.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                New password (min 8 chars)
              </span>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={!isReady}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                Confirm new password
              </span>
              <input
                type="password"
                className="field-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={!isReady}
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

            {successMessage && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              >
                {successMessage}
                {redirectCountdown !== null && (
                  <span className="ml-1">
                    Redirecting to login in {Math.max(redirectCountdown, 0)}s...
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isReady || redirectCountdown !== null}
              className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
