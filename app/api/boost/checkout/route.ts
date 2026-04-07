import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth-session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BOOST_PRICE_SGD_CENTS = 500;
const ROUTE_LIMIT = 30;
const ROUTE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit({
    request,
    scope: "api:boost-checkout",
    limit: ROUTE_LIMIT,
    windowMs: ROUTE_WINDOW_MS,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }

  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to boost your profile." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin client is not configured." },
      { status: 500 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error:
          "Create and save your caregiver profile first, then start the boost checkout.",
      },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/caregiver/dashboard?boost=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/caregiver/dashboard?boost=cancelled`;

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("allow_promotion_codes", "true");
  body.set("metadata[user_id]", user.id);
  body.set("metadata[profile_id]", profile.id);
  body.set("metadata[feature]", "boost_profile_7_days");

  const stripePriceId = process.env.STRIPE_BOOST_PRICE_ID?.trim();
  if (stripePriceId) {
    body.set("line_items[0][price]", stripePriceId);
    body.set("line_items[0][quantity]", "1");
  } else {
    body.set("line_items[0][price_data][currency]", "sgd");
    body.set("line_items[0][price_data][unit_amount]", `${BOOST_PRICE_SGD_CENTS}`);
    body.set("line_items[0][price_data][product_data][name]", "Boost Profile for 7 Days");
    body.set("line_items[0][price_data][product_data][description]", "Display profile at the top of directory search for 7 days.");
    body.set("line_items[0][quantity]", "1");
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `Stripe checkout creation failed (${response.status}): ${text.slice(0, 180)}` },
      { status: 500 }
    );
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.url });
}
