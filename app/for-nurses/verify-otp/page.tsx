"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import OnboardingStepper from "@/components/onboarding-stepper";
import SiteHeader from "@/components/site-header";
import {
  clearCaregiverSignupContext,
  readCaregiverSignupContext,
} from "@/lib/caregiver-signup-context";
import { normalizePhoneForAuth } from "@/lib/phone-format";
import { enforceAuthAttemptLimit } from "@/lib/security/auth-attempt-client";
import { getReadableAuthError } from "@/lib/supabase/auth-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_PHONE_LENGTH = 24;
const MAX_OTP_LENGTH = 10;

export default function CaregiverOtpVerificationPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const signupContext = useMemo(() => readCaregiverSignupContext(), []);

  useEffect(() => {
    const queryPhone =
      typeof window !== "undefined"
        ? normalizePhoneForAuth(new URLSearchParams(window.location.search).get("phone") ?? "")
        : "";
    const contextPhone = normalizePhoneForAuth(signupContext?.phone ?? "");
    const nextPhone = queryPhone || contextPhone;
    if (nextPhone) {
      setPhone(nextPhone);
    }
  }, [signupContext]);

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
        clearCaregiverSignupContext();
        router.replace("/caregiver/dashboard");
      } else {
        router.replace("/directory");
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const normalizedPhone = normalizePhoneForAuth(phone);
    const token = otpCode.trim();

    if (normalizedPhone.length < 6) {
      setErrorMessage("Phone number is missing. Go back and create your account first.");
      return;
    }
    if (normalizedPhone.length > MAX_PHONE_LENGTH) {
      setErrorMessage("Phone number is too long.");
      return;
    }
    if (token.length < 4) {
      setErrorMessage("Enter the SMS verification code.");
      return;
    }
    if (token.length > MAX_OTP_LENGTH) {
      setErrorMessage("OTP code is too long.");
      return;
    }

    setIsVerifying(true);
    try {
      await enforceAuthAttemptLimit("caregiver_verify_otp");
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
        setErrorMessage("Unable to verify OTP. Please try again.");
        return;
      }

      const context = signupContext ?? readCaregiverSignupContext();
      const metadata = {
        account_type: "caregiver" as const,
        onboarding_stage: "otp_verified",
        full_name: context?.fullName ?? "",
        contact_email: context?.email ?? "",
        phone: normalizedPhone,
      };

      const { error: updateError } = await supabase.auth.updateUser({
        email: context?.email ?? undefined,
        data: metadata,
      });

      if (updateError) {
        setErrorMessage(getReadableAuthError(updateError));
        return;
      }

      clearCaregiverSignupContext();
      router.replace("/caregiver/dashboard?setup=1");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify OTP right now."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setErrorMessage(null);
    setStatusMessage(null);
    if (resendCooldown > 0) {
      return;
    }
    const normalizedPhone = normalizePhoneForAuth(phone);

    if (normalizedPhone.length < 6) {
      setErrorMessage("Please enter your phone number.");
      return;
    }
    if (normalizedPhone.length > MAX_PHONE_LENGTH) {
      setErrorMessage("Phone number is too long.");
      return;
    }

    setIsResending(true);
    try {
      await enforceAuthAttemptLimit("caregiver_resend_otp");
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

      setResendCooldown(30);
      setStatusMessage(`A new SMS code was sent to ${normalizedPhone}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to resend OTP right now."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="page-enter">
        <section className="surface-panel mx-auto max-w-2xl p-6 md:p-8">
          <p className="eyebrow">Caregiver Onboarding</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
            Verify your phone number
          </h1>
          <OnboardingStepper currentStep={2} className="mt-4" />
          <p className="mt-2 text-sm leading-6 text-[#56677c]">
            Stage 2 of 3: enter the OTP sent by SMS. After verification, you will continue to
            caregiver profile setup.
          </p>

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Phone number</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
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
              <span className="text-sm font-semibold text-[#243d58]">SMS verification code</span>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                className="field-input"
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={MAX_OTP_LENGTH}
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={isResending || resendCooldown > 0}
                  className="secondary-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending
                    ? "Resending..."
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                </button>
                <Link href="/for-nurses" className="text-sm font-semibold text-[#1f6b93]">
                  Edit account details
                </Link>
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="primary-btn min-w-[220px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? "Verifying..." : "Verify and continue"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
