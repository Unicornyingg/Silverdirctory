"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { normalizePhoneForAuth } from "@/lib/phone-format";
import { enforceAuthAttemptLimit } from "@/lib/security/auth-attempt-client";
import { getReadableAuthError } from "@/lib/supabase/auth-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountType = "caregiver" | "client";
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 24;
const MAX_OTP_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

function normalizeRequestedRole(role: string | null): AccountType | null {
  if (role === "caregiver" || role === "client") {
    return role;
  }
  return null;
}

function getRedirectForRole(role: string | null): string {
  if (role === "caregiver") return "/caregiver/dashboard?setup=1";
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
    initialRequestedRole ?? "client"
  );
  const [forcedAccountType, setForcedAccountType] = useState<AccountType | null>(
    initialRequestedRole
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isPhoneOtpSubmitting, setIsPhoneOtpSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    if (role === "caregiver") {
      const { data: caregiverProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      router.replace(caregiverProfile ? "/caregiver/dashboard" : "/caregiver/dashboard?setup=1");
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
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
        setErrorMessage("Email is too long.");
        return;
      }
      if (password.length > MAX_PASSWORD_LENGTH) {
        setErrorMessage("Password is too long.");
        return;
      }

      await enforceAuthAttemptLimit("login_password");
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
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
        error instanceof Error ? getReadableAuthError(error) : "Unable to sign in.";
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
      await enforceAuthAttemptLimit("login_google");
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
        setErrorMessage(getReadableAuthError(error));
        setIsGoogleSubmitting(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start Google sign-in.";
      setErrorMessage(message);
      setIsGoogleSubmitting(false);
    }
  }

  async function sendPhoneOtp() {
    setErrorMessage(null);
    setStatusMessage(null);

    const normalizedPhone = normalizePhoneForAuth(phoneOtp);
    if (normalizedPhone.length < 6) {
      setErrorMessage("Please enter your phone number.");
      return;
    }
    if (normalizedPhone.length > MAX_PHONE_LENGTH) {
      setErrorMessage("Phone number is too long.");
      return;
    }

    setIsPhoneOtpSubmitting(true);
    try {
      await enforceAuthAttemptLimit("login_send_otp");
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
        return;
      }

      setIsPhoneOtpSent(true);
      setStatusMessage(`SMS code sent to ${normalizedPhone}.`);
    } catch (error) {
      const message =
        error instanceof Error
          ? getReadableAuthError(error)
          : "Unable to send SMS code.";
      setErrorMessage(message);
    } finally {
      setIsPhoneOtpSubmitting(false);
    }
  }

  async function verifyPhoneOtp() {
    setErrorMessage(null);
    setStatusMessage(null);

    const normalizedPhone = normalizePhoneForAuth(phoneOtp);
    const token = phoneOtpCode.trim();
    if (normalizedPhone.length < 6) {
      setErrorMessage("Please enter your phone number.");
      return;
    }
    if (normalizedPhone.length > MAX_PHONE_LENGTH) {
      setErrorMessage("Phone number is too long.");
      return;
    }
    if (token.length < 4) {
      setErrorMessage("Please enter the SMS verification code.");
      return;
    }
    if (token.length > MAX_OTP_LENGTH) {
      setErrorMessage("SMS verification code is too long.");
      return;
    }

    setIsPhoneOtpSubmitting(true);
    try {
      await enforceAuthAttemptLimit("login_verify_otp");
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: "sms",
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
        return;
      }

      if (!data.user) {
        setErrorMessage("Unable to verify SMS code.");
        return;
      }

      const nextPath = readNextPathFromLocation();
      await redirectByRole(data.user.id, nextPath);
    } catch (error) {
      const message =
        error instanceof Error
          ? getReadableAuthError(error)
          : "Unable to verify SMS code.";
      setErrorMessage(message);
    } finally {
      setIsPhoneOtpSubmitting(false);
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
    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
      setErrorMessage("Email is too long.");
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMessage(getReadableAuthError(error));
        return;
      }

      setForgotMessage(
        "Password reset link sent. Check your email inbox (and spam folder)."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? getReadableAuthError(error)
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
              ? "Sign in as a family account to browse caregiver profiles."
              : "Choose account type before sign in. Caregiver and family accounts support email/password or SMS OTP."}
          </p>

          <div className="mt-5 rounded-xl border border-[#dbe5ed] bg-white/85 p-4 text-sm text-[#51647b]">
            Need an account?
            <Link href="/signup" className="ml-2 font-semibold text-[#1f6b93]">
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
            <div className="mb-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setAccountType("caregiver");
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setPhoneOtp("");
                  setPhoneOtpCode("");
                  setIsPhoneOtpSent(false);
                }}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  accountType === "caregiver"
                    ? "border-[#4338ca] bg-indigo-50 shadow-[0_8px_18px_rgba(67,56,202,0.14)]"
                    : "border-[#d8e3eb] bg-white/90 hover:border-[#bccddd] hover:bg-[#f5f9fc]"
                }`}
              >
                <span className="block text-sm font-bold text-[#10233b]">I&apos;m a Caregiver</span>
                <span className="mt-1 block text-xs text-[#4f647e]">
                  Offer care services and manage your listing.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("client");
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setPhoneOtp("");
                  setPhoneOtpCode("");
                  setIsPhoneOtpSent(false);
                }}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  accountType === "client"
                    ? "border-[#4338ca] bg-indigo-50 shadow-[0_8px_18px_rgba(67,56,202,0.14)]"
                    : "border-[#d8e3eb] bg-white/90 hover:border-[#bccddd] hover:bg-[#f5f9fc]"
                }`}
              >
                <span className="block text-sm font-bold text-[#10233b]">I&apos;m a Family Member</span>
                <span className="mt-1 block text-xs text-[#4f647e]">
                  Browse caregivers and start secure chats.
                </span>
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

              <div className="mb-4 space-y-3 rounded-xl border border-[#d8e3eb] bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#61758d]">
                  Family SMS Login
                </p>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Phone number</span>
                  <input
                    value={phoneOtp}
                    onChange={(event) => setPhoneOtp(event.target.value)}
                    className="field-input"
                    placeholder="+65 8123 4567"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={MAX_PHONE_LENGTH}
                  />
                </label>
                {isPhoneOtpSent && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#243d58]">SMS code</span>
                    <input
                      value={phoneOtpCode}
                      onChange={(event) => setPhoneOtpCode(event.target.value)}
                      className="field-input"
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={MAX_OTP_LENGTH}
                    />
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendPhoneOtp()}
                    disabled={isPhoneOtpSubmitting}
                    className="secondary-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPhoneOtpSubmitting && !isPhoneOtpSent
                      ? "Sending code..."
                      : isPhoneOtpSent
                        ? "Resend code"
                        : "Send SMS code"}
                  </button>
                  {isPhoneOtpSent && (
                    <button
                      type="button"
                      onClick={() => void verifyPhoneOtp()}
                      disabled={isPhoneOtpSubmitting}
                      className="primary-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPhoneOtpSubmitting ? "Verifying..." : "Verify and sign in"}
                    </button>
                  )}
                </div>
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#d8e3eb]" />
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70829a]">
                  or email/password
                </span>
                <div className="h-px flex-1 bg-[#d8e3eb]" />
              </div>
            </>
          ) : (
            <div className="mb-4 space-y-3 rounded-xl border border-[#d8e3eb] bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#61758d]">
                Caregiver SMS Login
              </p>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">Phone number</span>
                <input
                  value={phoneOtp}
                  onChange={(event) => setPhoneOtp(event.target.value)}
                  className="field-input"
                  placeholder="+65 8123 4567"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={MAX_PHONE_LENGTH}
                />
              </label>
              {isPhoneOtpSent && (
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">SMS code</span>
                  <input
                    value={phoneOtpCode}
                    onChange={(event) => setPhoneOtpCode(event.target.value)}
                    className="field-input"
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={MAX_OTP_LENGTH}
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void sendPhoneOtp()}
                  disabled={isPhoneOtpSubmitting}
                  className="secondary-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPhoneOtpSubmitting && !isPhoneOtpSent
                    ? "Sending code..."
                    : isPhoneOtpSent
                      ? "Resend code"
                      : "Send SMS code"}
                </button>
                {isPhoneOtpSent && (
                  <button
                    type="button"
                    onClick={() => void verifyPhoneOtp()}
                    disabled={isPhoneOtpSubmitting}
                    className="primary-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPhoneOtpSubmitting ? "Verifying..." : "Verify and sign in"}
                  </button>
                )}
              </div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Caregiver accounts can also sign in with email/password below.
              </p>
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
                autoComplete="email"
                maxLength={MAX_EMAIL_LENGTH}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="field-input pr-20"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2d4f6e] hover:text-[#1b3c59]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotPassword((previous) => !previous)}
              className="text-sm font-semibold text-[#1f6b93] underline-offset-2 hover:underline"
            >
              {showForgotPassword ? "Hide password reset" : "Forgot password?"}
            </button>

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
                  autoComplete="email"
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                />
              </label>

              {forgotMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
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
