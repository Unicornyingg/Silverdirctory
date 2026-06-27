import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  readJsonWithLimit,
} from "@/lib/security/api-guard";

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 2 * 1024;

const ALLOWED_ROUTES = new Set([
  "caregiver_signup",
  "caregiver_verify_otp",
  "caregiver_resend_otp",
  "client_signup",
  "login_password",
  "login_send_otp",
  "login_verify_otp",
]);

type AuthAttemptPayload = {
  route?: string;
};

export async function POST(request: Request) {
  const raw = await request.text();
  const parsed = readJsonWithLimit(raw, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = (parsed.data ?? {}) as AuthAttemptPayload;
  const route = typeof payload.route === "string" ? payload.route.trim() : "";
  if (!ALLOWED_ROUTES.has(route)) {
    return NextResponse.json({ error: "Invalid auth route." }, { status: 400 });
  }

  const routeLimitResponse = enforceRateLimit({
    request,
    scope: `api:auth-attempt:${route}`,
    limit: AUTH_LIMIT,
    windowMs: AUTH_WINDOW_MS,
  });
  if (routeLimitResponse) return routeLimitResponse;

  return NextResponse.json({
    ok: true,
    route,
    limit: AUTH_LIMIT,
    windowMinutes: 15,
  });
}
