import { NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest } from "@/lib/supabase/auth-session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ConfirmPayload = {
  sessionId?: string;
};

type StripeCheckoutSession = {
  id: string;
  payment_status?: string;
  metadata?: Record<string, string>;
};

export async function POST(request: Request) {
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
      { error: "You must be logged in to confirm boost." },
      { status: 401 }
    );
  }

  let payload: ConfirmPayload;
  try {
    payload = (await request.json()) as ConfirmPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = payload.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing Stripe session id." },
      { status: 400 }
    );
  }

  const sessionResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    }
  );

  if (!sessionResponse.ok) {
    const text = await sessionResponse.text();
    return NextResponse.json(
      { error: `Stripe session lookup failed (${sessionResponse.status}): ${text.slice(0, 180)}` },
      { status: 500 }
    );
  }

  const session = (await sessionResponse.json()) as StripeCheckoutSession;
  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Boost payment is not marked as paid yet." },
      { status: 400 }
    );
  }

  const sessionUserId = session.metadata?.user_id ?? "";
  if (sessionUserId !== user.id) {
    return NextResponse.json(
      { error: "This checkout session does not belong to the logged-in caregiver." },
      { status: 403 }
    );
  }

  const profileId = session.metadata?.profile_id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin client is not configured." },
      { status: 500 }
    );
  }

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  let updateQuery = supabase
    .from("profiles")
    .update({
      is_boosted: true,
      boost_expires_at: expiresAt,
    })
    .eq("user_id", user.id);

  if (profileId) {
    updateQuery = updateQuery.eq("id", profileId);
  }

  const { error: updateError } = await updateQuery;
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    expiresAt,
  });
}
