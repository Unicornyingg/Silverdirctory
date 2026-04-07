import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/security/rate-limit";

type RateLimitOptions = {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
};

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function enforceRateLimit({
  request,
  scope,
  limit,
  windowMs,
}: RateLimitOptions): NextResponse | null {
  const ip = getClientIp(request);
  const result = consumeRateLimit({
    key: `${scope}:${ip}`,
    limit,
    windowMs,
  });

  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

export function readJsonWithLimit(rawText: string, maxBytes: number): {
  data: unknown | null;
  error: string | null;
} {
  const size = new TextEncoder().encode(rawText).length;
  if (size > maxBytes) {
    return { data: null, error: "Payload too large." };
  }

  try {
    const parsed = JSON.parse(rawText) as unknown;
    return { data: parsed, error: null };
  } catch {
    return { data: null, error: "Malformed JSON payload." };
  }
}
