type AuthAttemptRoute =
  | "caregiver_signup"
  | "caregiver_verify_otp"
  | "caregiver_resend_otp"
  | "client_signup"
  | "login_password"
  | "login_send_otp"
  | "login_verify_otp"
  | "login_google"
  | "signup_google";

export async function enforceAuthAttemptLimit(
  route: AuthAttemptRoute
): Promise<void> {
  const response = await fetch("/api/auth/attempt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ route }),
  });

  if (response.ok) return;

  let message = "Too many authentication attempts. Please try again later.";
  try {
    const payload = (await response.json()) as {
      error?: string;
      retryAfterSeconds?: number;
    };

    if (response.status === 429 && payload.retryAfterSeconds) {
      const minutes = Math.max(1, Math.ceil(payload.retryAfterSeconds / 60));
      message = `Too many authentication attempts. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
    } else if (payload.error) {
      message = payload.error;
    }
  } catch {
    // no-op: keep default message
  }

  throw new Error(message);
}
