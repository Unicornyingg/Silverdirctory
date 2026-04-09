type AuthLikeError = {
  message: string;
  code?: string;
};

export function getReadableAuthError(error: AuthLikeError): string {
  const message = error.message?.toLowerCase?.() ?? "";
  const code = (error.code ?? "").toLowerCase();

  if (code === "email_address_invalid") {
    return "Please enter a valid email address.";
  }

  if (code === "email_exists") {
    return "An account with this email already exists. Please sign in.";
  }

  if (code === "signup_disabled") {
    return "Signup is currently disabled in Supabase Auth settings.";
  }

  if (
    code.includes("phone") ||
    message.includes("phone provider is disabled") ||
    message.includes("phone signups are disabled") ||
    message.includes("phone sign-ins are disabled") ||
    message.includes("phone verification not enabled") ||
    (message.includes("phone") && message.includes("not enabled"))
  ) {
    return "Phone verification is not enabled in Supabase. Enable Phone Auth in Supabase Dashboard -> Authentication -> Providers -> Phone.";
  }

  if (message.includes("otp") && message.includes("expired")) {
    return "The OTP has expired. Please request a new code.";
  }

  if (message.includes("invalid") && message.includes("otp")) {
    return "The OTP is invalid. Please check the code and try again.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror")
  ) {
    return "Network error: unable to reach authentication services. Check your internet connection and refresh the page.";
  }

  return error.message || "Authentication failed.";
}
