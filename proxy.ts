import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "silver_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/admin/verify") {
    return NextResponse.next();
  }

  const expectedKey = process.env.ADMIN_REVIEW_KEY?.trim();
  if (!expectedKey) {
    return NextResponse.next();
  }

  const providedKey = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!providedKey) {
    return NextResponse.next();
  }

  if (providedKey !== expectedKey) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.searchParams.delete("key");
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: expectedKey,
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export const config = {
  matcher: ["/admin/verify"],
};
