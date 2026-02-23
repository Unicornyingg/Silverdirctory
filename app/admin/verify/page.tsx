import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/site-header";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendNurseVerifiedEmail } from "@/lib/email/send-verification-email";
import type { NurseProfile } from "@/lib/supabase/types";

type PendingNurse = Pick<
  NurseProfile,
  | "id"
  | "full_name"
  | "location"
  | "bio"
  | "contact_email"
  | "profile_photo_url"
  | "license_photo_url"
  | "created_at"
>;

export const dynamic = "force-dynamic";

async function markNurseVerified(formData: FormData) {
  "use server";

  const nurseId = String(formData.get("nurse_id") ?? "");
  const submittedKey = String(formData.get("review_key") ?? "");
  const nurseName = String(formData.get("nurse_name") ?? "");
  const nurseEmail = String(formData.get("nurse_email") ?? "");
  const expectedKey = process.env.ADMIN_REVIEW_KEY;
  let status = "verified";
  let message = "";

  if (!expectedKey || submittedKey !== expectedKey) {
    redirect(
      `/admin/verify?key=${encodeURIComponent(
        submittedKey
      )}&status=error&message=${encodeURIComponent(
        "Unauthorized verification request."
      )}`
    );
  }

  if (!nurseId) {
    redirect(
      `/admin/verify?key=${encodeURIComponent(
        submittedKey
      )}&status=error&message=${encodeURIComponent("Missing nurse id.")}`
    );
  }

  if (!nurseEmail) {
    redirect(
      `/admin/verify?key=${encodeURIComponent(
        submittedKey
      )}&status=error&message=${encodeURIComponent(
        "This profile has no email. Cannot auto-send verification email."
      )}`
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    redirect(
      `/admin/verify?key=${encodeURIComponent(
        submittedKey
      )}&status=error&message=${encodeURIComponent(
        "Admin Supabase client is not configured."
      )}`
    );
  }

  const { error: verifyError } = await supabase
    .from("nurse_profiles")
    .update({ verified: true })
    .eq("id", nurseId);

  if (verifyError) {
    redirect(
      `/admin/verify?key=${encodeURIComponent(
        submittedKey
      )}&status=error&message=${encodeURIComponent(verifyError.message)}`
    );
  }

  try {
    await sendNurseVerifiedEmail({
      nurseName: nurseName || "Nurse",
      toEmail: nurseEmail,
    });
  } catch (error) {
    status = "partial";
    message =
      error instanceof Error
        ? error.message
        : "Profile was verified but email could not be sent.";
  }

  revalidatePath("/admin/verify");
  const query = new URLSearchParams({
    key: submittedKey,
    status,
  });
  if (message) {
    query.set("message", message);
  }
  redirect(`/admin/verify?${query.toString()}`);
}

function getKey(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function GateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <div className="surface-panel page-enter mx-auto max-w-2xl p-6 text-[#85410b]">
        <h1 className="text-2xl font-bold text-[#10233b]">{title}</h1>
        <p className="mt-3 text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reviewKey = getKey(params.key);
  const status = getKey(params.status);
  const statusMessage = getKey(params.message);
  const expectedKey = process.env.ADMIN_REVIEW_KEY;

  if (!expectedKey) {
    return (
      <GateMessage
        title="Admin review is not configured"
        description="Add `ADMIN_REVIEW_KEY` to `.env.local` and restart your server."
      />
    );
  }

  if (reviewKey !== expectedKey) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <div className="surface-panel mx-auto max-w-2xl p-6 text-red-700 page-enter">
          <h1 className="text-2xl font-bold text-[#10233b]">Access denied</h1>
          <p className="mt-3 text-sm">
            Open this page with your admin key:
            <br />
            <code className="mt-3 inline-block rounded bg-red-100 px-2 py-1 text-xs text-red-800">
              /admin/verify?key=YOUR_ADMIN_REVIEW_KEY
            </code>
          </p>
        </div>
      </div>
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return (
      <GateMessage
        title="Admin client is not configured"
        description="Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart your server."
      />
    );
  }

  const { data, error } = await supabase
    .from("nurse_profiles")
    .select(
      "id, full_name, location, bio, contact_email, profile_photo_url, license_photo_url, created_at"
    )
    .eq("verified", false)
    .order("created_at", { ascending: true })
    .returns<PendingNurse[]>();

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <p className="eyebrow">Admin Workflow</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
          Nurse Verification Queue
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56677c]">
          Review each uploaded license image. Approve nurses after manual checks.
          A verification email is sent automatically after approval.
        </p>
      </section>

      {status === "verified" && (
        <div className="surface-panel mt-6 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Nurse was verified and confirmation email was sent.
        </div>
      )}

      {status === "partial" && (
        <div className="surface-panel mt-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Nurse was verified, but email send failed. {statusMessage}
        </div>
      )}

      {status === "error" && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Verification failed. {statusMessage}
        </div>
      )}

      {error && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load verification queue: {error.message}
        </div>
      )}

      {!error && (!data || data.length === 0) && (
        <div className="surface-panel mt-6 p-6 text-sm text-[#526277]">
          No pending nurses to review right now.
        </div>
      )}

      {!error && data && data.length > 0 && (
        <section className="stagger mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {data.map((nurse) => {
            const createdDate = new Date(nurse.created_at).toLocaleString(
              "en-US",
              { dateStyle: "medium", timeStyle: "short" }
            );

            const emailHref = nurse.contact_email
              ? `mailto:${nurse.contact_email}?subject=${encodeURIComponent(
                  "Your nurse profile has been verified"
                )}&body=${encodeURIComponent(
                  `Hi ${nurse.full_name},\n\nYour nursing profile has been verified and is now listed on our caregiver directory.\n\nThank you,\nCaregiver Network`
                )}`
              : null;

            return (
              <article key={nurse.id} className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#10243b]">
                      {nurse.full_name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#54677f]">
                      {nurse.location}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#dce7ee] bg-white px-2.5 py-1 text-xs font-semibold text-[#4d627d]">
                    Submitted {createdDate}
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-[#dde7ee] bg-[#f5f8fb]">
                  <div className="border-b border-[#dde7ee] bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                    Public profile photo
                  </div>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <div className="h-16 w-16 overflow-hidden rounded-full border border-[#dbe6ee] bg-[#eaf2f8]">
                      {nurse.profile_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={nurse.profile_photo_url}
                          alt={`${nurse.full_name} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#2d4d6a]">
                          RN
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-[#5b6d81]">
                      This image is shown publicly in the nurse directory.
                    </p>
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-[#dde7ee] bg-[#f5f8fb]">
                  <div className="border-b border-[#dde7ee] bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                    License photo for verification
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={nurse.license_photo_url}
                    alt={`${nurse.full_name} nursing license`}
                    className="h-72 w-full object-contain"
                  />
                </div>

                <div className="mt-4 grid gap-2 text-sm text-[#4f6179]">
                  <p>
                    <span className="font-semibold text-[#1f3654]">Email:</span>{" "}
                    {nurse.contact_email ?? "Not provided"}
                  </p>
                </div>

                <p className="mt-3 text-sm leading-6 text-[#56677e]">{nurse.bio}</p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <form action={markNurseVerified}>
                    <input type="hidden" name="nurse_id" value={nurse.id} />
                    <input type="hidden" name="review_key" value={reviewKey} />
                    <input
                      type="hidden"
                      name="nurse_name"
                      value={nurse.full_name}
                    />
                    <input
                      type="hidden"
                      name="nurse_email"
                      value={nurse.contact_email ?? ""}
                    />
                    <button type="submit" className="primary-btn text-sm">
                      Mark as verified
                    </button>
                  </form>

                  {emailHref && (
                    <a href={emailHref} className="secondary-btn text-sm">
                      Email nurse
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
