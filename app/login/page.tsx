"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountType = "caregiver" | "client";

function normalizeRequestedRole(role: string | null): AccountType | null {
  if (role === "caregiver" || role === "client") {
    return role;
  }
  return null;
}

function getRedirectForRole(role: string | null): string {
  if (role === "caregiver") return "/caregiver/dashboard";
  return "/directory";
}

function getSafeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null;
  return trimmed;
}

function readNextPathFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return getSafeNextPath(params.get("next"));
}

function readRequestedRoleFromLocation(): AccountType | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeRequestedRole(params.get("role"));
}

export default function LoginPage() {
  const router = useRouter();
  const initialRequestedRole = readRequestedRoleFromLocation();
  const [accountType, setAccountType] = useState<AccountType>(
    initialRequestedRole ?? "caregiver"
  );
  const [forcedAccountType, setForcedAccountType] = useState<AccountType | null>(
    initialRequestedRole
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const isRoleLocked = forcedAccountType !== null;

  const redirectByRole = useCallback(async (userId: string, nextPath: string | null) => {
    const supabase = getSupabaseBrowserClient();
    const { data: appUser } = await supabase
      .from("users")
      .select("role, is_suspended, is_banned")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();

    if (appUser?.is_banned || appUser?.is_suspended) {
      await supabase.auth.signOut();
      setErrorMessage(
        "Your account is currently restricted. Contact support if you believe this is a mistake."
      );
      return false;
    }

    const role = appUser?.role ?? null;
    if (nextPath && role !== "caregiver") {
      router.replace(nextPath);
      return true;
    }

    router.replace(getRedirectForRole(role));
    return true;
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPath = getSafeNextPath(params.get("next"));
    const requestedRole = normalizeRequestedRole(params.get("role"));
    setForcedAccountType(requestedRole);
    if (requestedRole) {
      setAccountType(requestedRole);
    }
    if (params.get("status") === "password-reset") {
      setStatusMessage("Password updated successfully. Please sign in.");
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        if (nextPath) {
          const redirected = await redirectByRole(sessionUser.id, nextPath);
          if (!redirected) return;
          return;
        }

        const { data: appUser } = await supabase
          .from("users")
          .select("role, is_suspended, is_banned")
          .eq("id", sessionUser.id)
          .limit(1)
          .maybeSingle();

        if (appUser?.is_banned || appUser?.is_suspended) {
          await supabase.auth.signOut();
          setErrorMessage(
            "Your account is currently restricted. Contact support if you believe this is a mistake."
          );
          return;
        }

        const role = appUser?.role;
        if (role === "client" || role === "caregiver") {
          setAccountType(role);
        }

        setStatusMessage((previous) => {
          if (previous) return previous;
          return "You are already signed in. Use top navigation to continue.";
        });
      }
    });
  }, [redirectByRole]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.user) {
        setErrorMessage("Unable to load account.");
        return;
      }

      const nextPath = readNextPathFromLocation();
      await redirectByRole(data.user.id, nextPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    setErrorMessage(null);
    setStatusMessage(null);
    if (accountType === "caregiver") {
      setErrorMessage("Offering care accounts must sign in with email/password.");
      return;
    }
    setIsGoogleSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const oauthParams = new URLSearchParams({
        source: "login",
        role: "client",
      });
      const nextPath = readNextPathFromLocation();
      if (nextPath) {
        oauthParams.set("next", nextPath);
      }
      const redirectTo = `${window.location.origin}/oauth-complete?${oauthParams.toString()}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsGoogleSubmitting(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start Google sign-in.";
      setErrorMessage(message);
      setIsGoogleSubmitting(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setForgotMessage(null);
    setStatusMessage(null);

    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (normalizedEmail.length < 4) {
      setErrorMessage("Please enter your account email to reset password.");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setForgotMessage(
        "Password reset link sent. Check your email inbox (and spam folder)."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send password reset email.";
      setErrorMessage(message);
    } finally {
      setIsForgotSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-panel page-enter h-fit p-6">
          <p className="eyebrow">Account Access</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b]">
            Sign in to Silver Directory
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#56677d]">
            {isRoleLocked && accountType === "client"
              ? "Sign in as a family account to start chat with caregivers."
              : "Choose account type before sign in. Offering care accounts use email/password only."}
          </p>

          <div className="mt-5 rounded-xl border border-[#dbe5ed] bg-white/85 p-4 text-sm text-[#51647b]">
            Need an account?
            <Link href="/for-nurses" className="ml-2 font-semibold text-[#1f6b93]">
              Create account
            </Link>
          </div>
        </section>

        <section className="surface-panel page-enter p-6 md:p-8">
          {isRoleLocked ? (
            <div className="mb-5 rounded-xl border border-[#d8e3eb] bg-[#eef4f8] px-4 py-3 text-sm font-semibold text-[#294765]">
              {accountType === "client"
                ? "Sign in as: Family account"
                : "Sign in as: Caregiver account"}
            </div>
          ) : (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-[#d8e3eb] bg-white/75 p-1">
              <button
                type="button"
                onClick={() => {
                  setAccountType("caregiver");
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  accountType === "caregiver"
                    ? "bg-[#0f766e] text-white"
                    : "text-[#31506f] hover:bg-[#edf3f7]"
                }`}
              >
                I am offering care
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("client");
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  accountType === "client"
                    ? "bg-[#0f766e] text-white"
                    : "text-[#31506f] hover:bg-[#edf3f7]"
                }`}
              >
                I am looking for care
              </button>
            </div>
          )}

          {accountType === "client" ? (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isGoogleSubmitting}
                className="secondary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGoogleSubmitting
                  ? "Redirecting to Google..."
                  : "Continue with Google"}
              </button>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#d8e3eb]" />
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70829a]">
                  or
                </span>
                <div className="h-px flex-1 bg-[#d8e3eb]" />
              </div>
            </>
          ) : (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Offering care accounts: sign in with email/password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Email</span>
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Password</span>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
              />
            </label>

            <button
              type="button"
              onClick={() => setShowForgotPassword((previous) => !previous)}
              className="text-sm font-semibold text-[#1f6b93] underline-offset-2 hover:underline"
            >
              {showForgotPassword ? "Hide password reset" : "Forgot password?"}
            </button>

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {statusMessage && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {statusMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {showForgotPassword && (
            <form onSubmit={handleForgotPassword} className="mt-5 space-y-3 border-t border-[#d8e3eb] pt-5">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Reset password email
                </span>
                <input
                  type="email"
                  className="field-input"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </label>

              {forgotMessage && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {forgotMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isForgotSubmitting}
                className="secondary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isForgotSubmitting
                  ? "Sending reset link..."
                  : "Send password reset link"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
