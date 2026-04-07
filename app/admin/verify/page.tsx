import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sendNurseRejectedEmail,
  sendNurseVerifiedEmail,
} from "@/lib/email/send-verification-email";
import {
  statusLabel as licenseStatusLabel,
  type CaregiverLicenseStatus,
} from "@/lib/caregiver-license-status";
import {
  CARE_SERVICE_CATEGORY_OPTIONS,
  type CareServiceCategory,
  getRateLabelByCategory,
  getRateSuffixByCategory,
  isSupportedCareServiceCategory,
  sanitizeCareServices,
} from "@/lib/care-services";
import { sanitizeCaregiverLanguages } from "@/lib/caregiver-languages";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CaregiverProfile,
  ChatMessage,
  ChatReport,
  ChatThread,
  ClientProfile,
  MarketplaceUser,
  VerificationDoc,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
const ADMIN_SESSION_COOKIE = "silver_admin_session";

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

type PendingDoc = Pick<
  VerificationDoc,
  "id" | "user_id" | "document_url" | "status" | "created_at" | "review_notes"
>;

type VerificationProfileRecord = Pick<
  CaregiverProfile,
  | "id"
  | "user_id"
  | "full_name"
  | "location"
  | "bio"
  | "hourly_rate"
  | "service_category"
  | "care_specialties"
  | "languages_spoken"
  | "profile_photo_url"
  | "licensed_nurse_status"
  | "is_verified"
>;

type AdminUserRecord = Pick<
  MarketplaceUser,
  "id" | "email" | "role" | "is_suspended" | "is_banned" | "moderation_note" | "created_at"
>;

type ReviewItem = {
  docId: string;
  userId: string;
  documentUrl: string;
  previewUrl: string | null;
  submittedAt: string;
  reviewNotes: string | null;
  profile: VerificationProfileRecord | null;
  user: AdminUserRecord | null;
};

type OpenReportRecord = Pick<
  ChatReport,
  | "id"
  | "thread_id"
  | "reporter_user_id"
  | "reported_user_id"
  | "reason"
  | "details"
  | "status"
  | "created_at"
  | "resolution_notes"
>;

type ReportItem = {
  report: OpenReportRecord;
  reporter: AdminUserRecord | null;
  reported: AdminUserRecord | null;
};

type DirectoryCaregiverRecord = Pick<
  CaregiverProfile,
  | "id"
  | "user_id"
  | "full_name"
  | "bio"
  | "hourly_rate"
  | "service_category"
  | "location"
  | "care_specialties"
  | "languages_spoken"
  | "licensed_nurse_status"
  | "is_verified"
>;

type DirectoryClientRecord = Pick<
  ClientProfile,
  "id" | "user_id" | "full_name" | "phone" | "location"
>;

type ChatThreadRecord = Pick<ChatThread, "id" | "client_user_id" | "caregiver_profile_id">;
type ChatMessageRecord = Pick<
  ChatMessage,
  "id" | "thread_id" | "sender_user_id" | "body" | "created_at"
>;

type ReportEvidence = {
  thread: ChatThreadRecord;
  clientName: string;
  clientEmail: string;
  caregiverName: string;
  caregiverEmail: string;
  messages: ChatMessageRecord[];
};

const CARE_SPECIALTY_SPLIT = /[,;\n]/;
const MAX_REJECTION_REASON_LENGTH = 2000;
const MAX_RESOLUTION_NOTES_LENGTH = 3000;
const MAX_FULL_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 32;
const MAX_LOCATION_LENGTH = 200;
const MAX_BIO_LENGTH = 5000;
const MAX_SPECIALTIES_LENGTH = 2000;
const MAX_LANGUAGES_LENGTH = 1000;
const MAX_ADMIN_NOTE_LENGTH = 600;

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeReportReason(reason: OpenReportRecord["reason"]): string {
  if (reason === "agency_poaching") return "Agency Poaching";
  if (reason === "harassment") return "Harassment";
  if (reason === "scam") return "Scam";
  return "Other";
}

function parseCareSpecialties(raw: string, category: CareServiceCategory): string[] {
  return sanitizeCareServices(
    raw
      .split(CARE_SPECIALTY_SPLIT)
      .map((item) => item.trim())
      .filter(Boolean),
    category
  );
}

function parseLanguagesSpoken(raw: string): string[] {
  return sanitizeCaregiverLanguages(
    raw
      .split(CARE_SPECIALTY_SPLIT)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function adminPath(
  reviewKey: string,
  updates: Record<string, string | undefined> = {}
): string {
  const params = new URLSearchParams();
  if (reviewKey) {
    params.set("key", reviewKey);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value && value.trim().length > 0) {
      params.set(key, value.trim());
    }
  }
  const queryString = params.toString();
  return queryString ? `/admin/verify?${queryString}` : "/admin/verify";
}

function createStatusRedirect(
  reviewKey: string,
  status: string,
  message?: string,
  extras: Record<string, string | undefined> = {},
  hash?: string
): string {
  const params = new URLSearchParams({
    status,
    ...extras,
  });

  if (reviewKey) {
    params.set("key", reviewKey);
  }

  if (message && message.trim().length > 0) {
    params.set("message", message.trim());
  }

  const path = `/admin/verify?${params.toString()}`;
  return hash ? `${path}#${hash}` : path;
}

async function isAdminAuthorized(
  providedKey: string
): Promise<{ allowed: boolean; activeKey: string }> {
  const expectedKey = process.env.ADMIN_REVIEW_KEY?.trim() ?? "";
  if (!expectedKey) return { allowed: false, activeKey: "" };

  const cookieStore = await cookies();
  const cookieKey = cookieStore.get(ADMIN_SESSION_COOKIE)?.value?.trim() ?? "";
  const matchedKey =
    providedKey === expectedKey ? providedKey : cookieKey === expectedKey ? cookieKey : "";

  return { allowed: Boolean(matchedKey), activeKey: matchedKey };
}

async function clearAdminSession() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    path: "/admin",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin/verify");
}

function DashboardHeader({ reviewKey }: { reviewKey: string }) {
  return (
    <header className="top-nav page-enter">
      <Link href={adminPath(reviewKey)} className="brand-chip">
        <span className="brand-badge">AD</span>
        <span className="brand-name">Admin Dashboard</span>
      </Link>

      <nav className="nav-links">
        <a href="#metrics" className="nav-link">
          Metrics
        </a>
        <a href="#verification" className="nav-link">
          Licence Review Queue
        </a>
        <a href="#reports" className="nav-link">
          Trust & Safety
        </a>
        <a href="#users" className="nav-link">
          User Directory
        </a>
        <Link href="/directory" className="nav-link">
          Public Directory
        </Link>
        <form action={clearAdminSession}>
          <button type="submit" className="nav-link">
            End Admin Session
          </button>
        </form>
      </nav>
    </header>
  );
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
      <div className="surface-panel page-enter mx-auto max-w-2xl p-6 text-[#85410b]">
        <h1 className="text-2xl font-bold text-[#10233b]">{title}</h1>
        <p className="mt-3 text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}

async function resolveDocumentPreview(
  documentUrl: string,
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
): Promise<string | null> {
  if (/^https?:\/\//i.test(documentUrl)) {
    return documentUrl;
  }

  const { data, error } = await supabase.storage
    .from("verification-documents")
    .createSignedUrl(documentUrl, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

async function handleVerificationDecision(formData: FormData) {
  "use server";

  const providedKey = String(formData.get("review_key") ?? "").trim();
  const { allowed, activeKey } = await isAdminAuthorized(providedKey);
  const docId = String(formData.get("doc_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const caregiverName = String(formData.get("caregiver_name") ?? "").trim();
  const caregiverEmail = String(formData.get("caregiver_email") ?? "").trim();
  const decisionInput = String(formData.get("decision") ?? "approved").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!allowed) {
    redirect(
      createStatusRedirect(
        "",
        "error",
        "Unauthorized admin request.",
        {},
        "verification"
      )
    );
  }

  if (!docId || !userId) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Missing licence review payload.",
        {},
        "verification"
      )
    );
  }
  if (docId.length > 64 || userId.length > 64) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Malformed verification identifiers.",
        {},
        "verification"
      )
    );
  }
  if (caregiverName.length > MAX_FULL_NAME_LENGTH || caregiverEmail.length > 320) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Malformed caregiver metadata.",
        { review: docId },
        "verification"
      )
    );
  }

  const decision: "approved" | "rejected" | "pending" =
    decisionInput === "rejected"
      ? "rejected"
      : decisionInput === "pending"
      ? "pending"
      : "approved";
  if (decision === "rejected" && rejectionReason.length < 5) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Please provide a rejection reason of at least 5 characters.",
        { review: docId },
        "verification"
      )
    );
  }
  if (rejectionReason.length > MAX_REJECTION_REASON_LENGTH) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Rejection reason is too long.",
        { review: docId },
        "verification"
      )
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Admin Supabase client is not configured.",
        {},
        "verification"
      )
    );
  }

  const { error: docError } = await supabase
    .from("verification_docs")
    .update({
      status: decision,
      review_notes: decision === "rejected" ? rejectionReason : null,
      reviewed_at: decision === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("user_id", userId);

  if (docError) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        docError.message,
        { review: docId },
        "verification"
      )
    );
  }

  const profilePatch: {
    licensed_nurse_status: CaregiverLicenseStatus;
  } = {
    licensed_nurse_status:
      decision === "approved"
        ? "licensed_nurse_approved"
        : decision === "rejected"
        ? "licence_rejected"
        : "pending_admin_review",
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profilePatch)
    .eq("user_id", userId);

  if (profileError) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        profileError.message,
        { review: docId },
        "verification"
      )
    );
  }

  let status: "approved" | "rejected" | "pending" | "partial" = decision;
  let statusMessage = "";

  const recipientEmail = caregiverEmail || null;
  if (recipientEmail && decision !== "pending") {
    try {
      if (decision === "approved") {
        await sendNurseVerifiedEmail({
          nurseName: caregiverName || "Caregiver",
          toEmail: recipientEmail,
        });
      } else {
        await sendNurseRejectedEmail({
          nurseName: caregiverName || "Caregiver",
          toEmail: recipientEmail,
          reason: rejectionReason,
        });
      }
    } catch (error) {
      status = "partial";
      statusMessage =
        error instanceof Error
          ? error.message
          : "Licence decision saved, but notification email failed.";
    }
  }

  revalidatePath("/admin/verify");
  revalidatePath("/directory");

  redirect(createStatusRedirect(activeKey, status, statusMessage, {}, "verification"));
}

async function handleReportResolution(formData: FormData) {
  "use server";

  const providedKey = String(formData.get("review_key") ?? "").trim();
  const { allowed, activeKey } = await isAdminAuthorized(providedKey);
  const reportId = String(formData.get("report_id") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "dismiss").trim();
  const resolutionNotes = String(formData.get("resolution_notes") ?? "").trim();

  if (!allowed) {
    redirect(createStatusRedirect("", "error", "Unauthorized admin request.", {}, "reports"));
  }

  if (!reportId) {
    redirect(createStatusRedirect(activeKey, "error", "Missing report ticket id.", {}, "reports"));
  }
  if (reportId.length > 64) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Malformed report ticket id.",
        {},
        "reports"
      )
    );
  }
  if (resolutionNotes.length > MAX_RESOLUTION_NOTES_LENGTH) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Resolution notes are too long.",
        { report: reportId },
        "reports"
      )
    );
  }

  if (!["dismiss", "suspend", "ban"].includes(resolution)) {
    redirect(createStatusRedirect(activeKey, "error", "Invalid report resolution action.", { report: reportId }, "reports"));
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    redirect(createStatusRedirect(activeKey, "error", "Admin Supabase client is not configured.", {}, "reports"));
  }

  const { data: report, error: reportError } = await supabase
    .from("chat_reports")
    .select("id, thread_id, reporter_user_id, reported_user_id, status")
    .eq("id", reportId)
    .limit(1)
    .maybeSingle();

  if (reportError || !report) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        reportError?.message ?? "Report ticket not found.",
        {},
        "reports"
      )
    );
  }

  let reportStatus: ChatReport["status"] = "dismissed";
  if (resolution === "suspend") reportStatus = "suspended";
  if (resolution === "ban") reportStatus = "banned";

  if (resolution === "suspend" || resolution === "ban") {
    const userPatch =
      resolution === "ban"
        ? {
            is_suspended: true,
            is_banned: true,
            moderation_note:
              resolutionNotes || "Banned by admin via Trust & Safety report resolution.",
            moderated_at: new Date().toISOString(),
          }
        : {
            is_suspended: true,
            moderation_note:
              resolutionNotes || "Suspended by admin via Trust & Safety report resolution.",
            moderated_at: new Date().toISOString(),
          };

    const { error: userModerationError } = await supabase
      .from("user_moderation")
      .upsert(
        {
          user_id: report.reported_user_id,
          is_suspended: userPatch.is_suspended ?? false,
          is_banned: userPatch.is_banned ?? false,
          moderation_note: userPatch.moderation_note ?? null,
          moderated_at: userPatch.moderated_at ?? null,
        },
        { onConflict: "user_id" }
      );

    if (userModerationError) {
      redirect(
        createStatusRedirect(
          activeKey,
          "error",
          userModerationError.message,
          { report: reportId },
          "reports"
        )
      );
    }

    await supabase
      .from("profiles")
      .update({
        is_verified: false,
        is_boosted: false,
        boost_expires_at: null,
      })
      .eq("user_id", report.reported_user_id);
  }

  const { error: reportUpdateError } = await supabase
    .from("chat_reports")
    .update({
      status: reportStatus,
      resolution_notes: resolutionNotes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (reportUpdateError) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        reportUpdateError.message,
        { report: reportId },
        "reports"
      )
    );
  }

  revalidatePath("/admin/verify");
  revalidatePath("/directory");
  revalidatePath("/chats");

  redirect(
    createStatusRedirect(
      activeKey,
      "success",
      `Report ticket resolved with action: ${resolution}.`,
      {},
      "reports"
    )
  );
}

async function handleUserOverride(formData: FormData) {
  "use server";

  const providedKey = String(formData.get("review_key") ?? "").trim();
  const { allowed, activeKey } = await isAdminAuthorized(providedKey);
  const userId = String(formData.get("user_id") ?? "").trim();
  const userRole = String(formData.get("user_role") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const serviceCategoryRaw = String(formData.get("service_category") ?? "").trim();
  const hourlyRateRaw = String(formData.get("hourly_rate") ?? "").trim();
  const careSpecialtiesRaw = String(formData.get("care_specialties") ?? "").trim();
  const languagesSpokenRaw = String(formData.get("languages_spoken") ?? "").trim();
  const accountStatus = String(formData.get("account_status") ?? "active").trim();
  const adminNote = String(formData.get("admin_note") ?? "").trim();

  if (!allowed) {
    redirect(createStatusRedirect("", "error", "Unauthorized admin request.", {}, "users"));
  }

  if (!userId || fullName.length < 2) {
    redirect(createStatusRedirect(activeKey, "error", "User id and full name are required.", {}, "users"));
  }
  if (userId.length > 64) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Malformed user id.",
        {},
        "users"
      )
    );
  }
  if (
    fullName.length > MAX_FULL_NAME_LENGTH ||
    phone.length > MAX_PHONE_LENGTH ||
    location.length > MAX_LOCATION_LENGTH ||
    bio.length > MAX_BIO_LENGTH ||
    careSpecialtiesRaw.length > MAX_SPECIALTIES_LENGTH ||
    languagesSpokenRaw.length > MAX_LANGUAGES_LENGTH ||
    adminNote.length > MAX_ADMIN_NOTE_LENGTH
  ) {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "One or more fields exceed allowed size limits.",
        { user: userId },
        "users"
      )
    );
  }

  if (!["client", "caregiver", "admin"].includes(userRole)) {
    redirect(createStatusRedirect(activeKey, "error", "Invalid user role payload.", { user: userId }, "users"));
  }

  if (!["active", "suspended", "banned"].includes(accountStatus)) {
    redirect(createStatusRedirect(activeKey, "error", "Invalid account status.", { user: userId }, "users"));
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    redirect(createStatusRedirect(activeKey, "error", "Admin Supabase client is not configured.", {}, "users"));
  }

  const isSuspended = accountStatus === "suspended" || accountStatus === "banned";
  const isBanned = accountStatus === "banned";

  const { error: userUpdateError } = await supabase
    .from("user_moderation")
    .upsert(
      {
        user_id: userId,
        is_suspended: isSuspended,
        is_banned: isBanned,
        moderation_note: adminNote || null,
        moderated_at: adminNote ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" }
    );

  if (userUpdateError) {
    redirect(createStatusRedirect(activeKey, "error", userUpdateError.message, { user: userId }, "users"));
  }

  if (userRole === "caregiver") {
    if (!isSupportedCareServiceCategory(serviceCategoryRaw)) {
      redirect(
        createStatusRedirect(
          activeKey,
          "error",
          "Service type is required for caregiver accounts.",
          { user: userId },
          "users"
        )
      );
    }

    const serviceCategory = serviceCategoryRaw;
    const hourlyRate = Number(hourlyRateRaw);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      redirect(
        createStatusRedirect(
          activeKey,
          "error",
          "Rate must be a valid number greater than 0.",
          { user: userId },
          "users"
        )
      );
    }

    const careSpecialties = parseCareSpecialties(careSpecialtiesRaw, serviceCategory);
    const languagesSpoken = parseLanguagesSpoken(languagesSpokenRaw);
    const caregiverPatch: {
      full_name: string;
      bio: string;
      hourly_rate: number;
      service_category: CareServiceCategory;
      location: string;
      care_specialties: string[];
      languages_spoken: string[];
      is_verified?: boolean;
      is_boosted?: boolean;
    } = {
      full_name: fullName,
      bio,
      hourly_rate: hourlyRate,
      service_category: serviceCategory,
      location: location || "Not provided",
      care_specialties: careSpecialties,
      languages_spoken: languagesSpoken,
    };
    if (isSuspended || isBanned) {
      caregiverPatch.is_verified = false;
    }
    if (isBanned || isSuspended) {
      caregiverPatch.is_boosted = false;
    }

    const { error: caregiverUpdateError } = await supabase
      .from("profiles")
      .update(caregiverPatch)
      .eq("user_id", userId);

    if (caregiverUpdateError) {
      redirect(
        createStatusRedirect(
          activeKey,
          "error",
          caregiverUpdateError.message,
          { user: userId },
          "users"
        )
      );
    }
  } else if (userRole === "client") {
    const { error: clientUpdateError } = await supabase
      .from("client_profiles")
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          phone: phone || null,
          location: location || null,
        },
        { onConflict: "user_id" }
      );

    if (clientUpdateError) {
      redirect(
        createStatusRedirect(
          activeKey,
          "error",
          clientUpdateError.message,
          { user: userId },
          "users"
        )
      );
    }
  } else {
    redirect(
      createStatusRedirect(
        activeKey,
        "error",
        "Admin accounts cannot be edited from this form.",
        { user: userId },
        "users"
      )
    );
  }

  revalidatePath("/admin/verify");
  revalidatePath("/directory");
  revalidatePath("/chats");

  redirect(
    createStatusRedirect(
      activeKey,
      "success",
      "User profile updated successfully.",
      { user: userId },
      "users"
    )
  );
}

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const providedReviewKey = getParam(params.key).trim();
  const status = getParam(params.status).trim();
  const statusMessage = getParam(params.message).trim();
  const reviewId = getParam(params.review).trim();
  const reportId = getParam(params.report).trim();
  const selectedUserId = getParam(params.user).trim();
  const userSearch = getParam(params.q).trim();
  const userRoleFilter = getParam(params.role_filter).trim();
  const expectedKey = process.env.ADMIN_REVIEW_KEY;

  if (!expectedKey) {
    return (
      <GateMessage
        title="Admin dashboard is not configured"
        description="Add `ADMIN_REVIEW_KEY` to `.env.local` and restart the server."
      />
    );
  }

  const cookieStore = await cookies();
  const sessionReviewKey = cookieStore.get(ADMIN_SESSION_COOKIE)?.value?.trim() ?? "";
  const activeReviewKey = providedReviewKey || sessionReviewKey;
  const reviewKey = providedReviewKey === expectedKey ? providedReviewKey : "";

  if (activeReviewKey !== expectedKey) {
    return (
      <div className="site-shell">
        <div className="surface-panel mx-auto max-w-2xl p-6 text-red-700 page-enter">
          <h1 className="text-2xl font-bold text-[#10233b]">Access denied</h1>
          <p className="mt-3 text-sm">
            Open this page once with your admin key to start a secure admin session:
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
        description="Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart the server."
      />
    );
  }

  const [
    pendingCountResult,
    approvedLicensedNurseResult,
    familyCountResult,
    inquiryCountResult,
  ] = await Promise.all([
    supabase
      .from("verification_docs")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("licensed_nurse_status", "licensed_nurse_approved"),
    supabase
      .from("users")
      .select("id", { head: true, count: "exact" })
      .eq("role", "client")
      .eq("is_banned", false),
    supabase.from("chat_threads").select("id", { head: true, count: "exact" }),
  ]);

  const pendingVerificationCount = pendingCountResult.count ?? 0;
  const totalApprovedLicensedNurses = approvedLicensedNurseResult.count ?? 0;
  const totalFamilyAccounts = familyCountResult.count ?? 0;
  const totalInquiriesSent = inquiryCountResult.count ?? 0;

  const { data: docs, error: docsError } = await supabase
    .from("verification_docs")
    .select("id, user_id, document_url, status, created_at, review_notes")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingDoc[]>();

  let reviewItems: ReviewItem[] = [];

  if (!docsError && docs && docs.length > 0) {
    const userIds = [...new Set(docs.map((doc) => doc.user_id))];

    const [{ data: profiles }, { data: users }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, user_id, full_name, location, bio, hourly_rate, service_category, care_specialties, languages_spoken, profile_photo_url, licensed_nurse_status, is_verified"
        )
        .in("user_id", userIds)
        .returns<VerificationProfileRecord[]>(),
      supabase
        .from("users")
        .select(
          "id, email, role, is_suspended, is_banned, moderation_note, created_at"
        )
        .in("id", userIds)
        .returns<AdminUserRecord[]>(),
    ]);

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    const userMap = new Map((users ?? []).map((user) => [user.id, user]));

    const previewEntries = await Promise.all(
      docs.map(async (doc) => {
        const previewUrl = await resolveDocumentPreview(doc.document_url, supabase);
        return [doc.id, previewUrl] as const;
      })
    );

    const previewMap = new Map(previewEntries);

    reviewItems = docs.map((doc) => ({
      docId: doc.id,
      userId: doc.user_id,
      documentUrl: doc.document_url,
      previewUrl: previewMap.get(doc.id) ?? null,
      submittedAt: doc.created_at,
      reviewNotes: doc.review_notes,
      profile: profileMap.get(doc.user_id) ?? null,
      user: userMap.get(doc.user_id) ?? null,
    }));
  }

  const selectedReview =
    reviewItems.find((item) => item.docId === reviewId) ?? reviewItems[0] ?? null;

  const { data: openReports, error: openReportsError } = await supabase
    .from("chat_reports")
    .select(
      "id, thread_id, reporter_user_id, reported_user_id, reason, details, status, created_at, resolution_notes"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .returns<OpenReportRecord[]>();

  let reportItems: ReportItem[] = [];
  if (!openReportsError && openReports && openReports.length > 0) {
    const reportUserIds = [
      ...new Set(
        openReports.flatMap((report) => [report.reporter_user_id, report.reported_user_id])
      ),
    ];

    const { data: reportUsers } = await supabase
      .from("users")
      .select("id, email, role, is_suspended, is_banned, moderation_note, created_at")
      .in("id", reportUserIds)
      .returns<AdminUserRecord[]>();

    const reportUserMap = new Map((reportUsers ?? []).map((user) => [user.id, user]));

    reportItems = openReports.map((report) => ({
      report,
      reporter: reportUserMap.get(report.reporter_user_id) ?? null,
      reported: reportUserMap.get(report.reported_user_id) ?? null,
    }));
  }

  const selectedReport =
    reportItems.find((item) => item.report.id === reportId) ?? reportItems[0] ?? null;

  let reportEvidence: ReportEvidence | null = null;

  if (selectedReport) {
    const { data: threadRow } = await supabase
      .from("chat_threads")
      .select("id, client_user_id, caregiver_profile_id")
      .eq("id", selectedReport.report.thread_id)
      .limit(1)
      .maybeSingle()
      .returns<ChatThreadRecord | null>();

    if (threadRow) {
      const [{ data: caregiverProfile }, { data: clientProfile }, { data: messages }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, user_id, full_name")
            .eq("id", threadRow.caregiver_profile_id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("client_profiles")
            .select("id, user_id, full_name, phone, location")
            .eq("user_id", threadRow.client_user_id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("chat_messages")
            .select("id, thread_id, sender_user_id, body, created_at")
            .eq("thread_id", threadRow.id)
            .order("created_at", { ascending: true })
            .returns<ChatMessageRecord[]>(),
        ]);

      const userIds = [
        threadRow.client_user_id,
        caregiverProfile?.user_id ?? "",
      ].filter(Boolean);
      const { data: users } = await supabase
        .from("users")
        .select("id, email, role, is_suspended, is_banned, moderation_note, created_at")
        .in("id", userIds)
        .returns<AdminUserRecord[]>();

      const userMap = new Map((users ?? []).map((user) => [user.id, user]));
      const caregiverUserId = caregiverProfile?.user_id ?? "";

      reportEvidence = {
        thread: threadRow,
        clientName: clientProfile?.full_name ?? "Family",
        clientEmail: userMap.get(threadRow.client_user_id)?.email ?? "Unknown",
        caregiverName: caregiverProfile?.full_name ?? "Caregiver",
        caregiverEmail: userMap.get(caregiverUserId)?.email ?? "Unknown",
        messages: messages ?? [],
      };
    }
  }

  const { data: allUsers, error: allUsersError } = await supabase
    .from("users")
    .select("id, email, role, is_suspended, is_banned, moderation_note, created_at")
    .in("role", ["client", "caregiver"])
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<AdminUserRecord[]>();

  let directoryRows: Array<{
    user: AdminUserRecord;
    caregiverProfile: DirectoryCaregiverRecord | null;
    clientProfile: DirectoryClientRecord | null;
    displayName: string;
    phone: string;
    location: string;
  }> = [];

  if (!allUsersError && allUsers && allUsers.length > 0) {
    const allUserIds = allUsers.map((user) => user.id);

    const [{ data: caregiverProfiles }, { data: clientProfiles }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, user_id, full_name, bio, hourly_rate, service_category, location, care_specialties, languages_spoken, licensed_nurse_status, is_verified"
        )
        .in("user_id", allUserIds)
        .returns<DirectoryCaregiverRecord[]>(),
      supabase
        .from("client_profiles")
        .select("id, user_id, full_name, phone, location")
        .in("user_id", allUserIds)
        .returns<DirectoryClientRecord[]>(),
    ]);

    const caregiverMap = new Map(
      (caregiverProfiles ?? []).map((profile) => [profile.user_id, profile])
    );
    const clientMap = new Map((clientProfiles ?? []).map((profile) => [profile.user_id, profile]));

    directoryRows = allUsers.map((user) => {
      const caregiverProfile = caregiverMap.get(user.id) ?? null;
      const clientProfile = clientMap.get(user.id) ?? null;
      const displayName =
        caregiverProfile?.full_name ??
        clientProfile?.full_name ??
        user.email.split("@")[0] ??
        "User";

      return {
        user,
        caregiverProfile,
        clientProfile,
        displayName,
        phone: clientProfile?.phone ?? "",
        location: caregiverProfile?.location ?? clientProfile?.location ?? "",
      };
    });
  }

  const normalizedSearch = userSearch.toLowerCase();
  const filteredDirectoryRows = directoryRows.filter((row) => {
    if (userRoleFilter && row.user.role !== userRoleFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      row.displayName,
      row.user.email,
      row.phone,
      row.location,
      row.caregiverProfile?.bio ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const selectedDirectoryUser =
    directoryRows.find((row) => row.user.id === selectedUserId) ??
    filteredDirectoryRows[0] ??
    null;

  const selectedDirectoryRole = selectedDirectoryUser?.user.role ?? "client";
  const selectedCaregiverProfile = selectedDirectoryUser?.caregiverProfile ?? null;
  const selectedClientProfile = selectedDirectoryUser?.clientProfile ?? null;
  const selectedCaregiverCategory: CareServiceCategory =
    selectedCaregiverProfile?.service_category ?? "home_personal_care";
  const selectedCaregiverRateLabel = getRateLabelByCategory(selectedCaregiverCategory);
  const selectedStatus = selectedDirectoryUser
    ? selectedDirectoryUser.user.is_banned
      ? "banned"
      : selectedDirectoryUser.user.is_suspended
      ? "suspended"
      : "active"
    : "active";

  return (
    <div className="site-shell">
      <DashboardHeader reviewKey={reviewKey} />

      <section className="surface-panel page-enter p-6 md:p-8">
        <p className="eyebrow">Restricted Workspace</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
          Admin Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#56677c]">
          Verification, trust & safety ticket resolution, and user profile overrides.
        </p>
      </section>

      {(status || statusMessage) && (
        <div
          className={`surface-panel mt-6 p-4 text-sm ${
            status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : status === "partial"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {statusMessage || "Action completed."}
        </div>
      )}

      <section id="metrics" className="anchor-target mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          className={`surface-panel p-5 ${
            pendingVerificationCount > 0
              ? "border-red-200 bg-red-50/80"
              : "border-[#d8e3eb] bg-white/85"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596d84]">
            Pending Verifications
          </p>
          <p
            className={`mt-2 text-3xl font-extrabold ${
              pendingVerificationCount > 0 ? "text-red-700" : "text-[#10233b]"
            }`}
          >
            {pendingVerificationCount}
          </p>
        </article>

        <article className="surface-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596d84]">
            Licensed Nurse Approved
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#10233b]">
            {totalApprovedLicensedNurses}
          </p>
        </article>

        <article className="surface-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596d84]">
            Total Family Accounts
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#10233b]">{totalFamilyAccounts}</p>
        </article>

        <article className="surface-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#596d84]">
            Total Inquiries Sent
          </p>
          <p className="mt-2 text-3xl font-extrabold text-[#10233b]">{totalInquiriesSent}</p>
        </article>
      </section>

      <section id="verification" className="surface-panel anchor-target mt-6 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Caregiver Onboarding</p>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#10233b]">
              Licence Review Queue
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              Review optional nursing licence uploads for the public Licensed Nurse tag.
            </p>
          </div>
        </div>

        {docsError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load licence review queue: {docsError.message}
          </div>
        )}

        {!docsError && reviewItems.length === 0 && (
          <div className="mt-4 rounded-xl border border-[#d8e3eb] bg-white/85 px-4 py-3 text-sm text-[#596d84]">
            No pending licence submissions right now.
          </div>
        )}

        {!docsError && reviewItems.length > 0 && (
          <>
            <div className="mt-5 overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eef3f8] text-[#2e4b6a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Caregiver</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item) => (
                    <tr key={item.docId} className="border-t border-[#e1e9ef] text-[#2f4a67]">
                      <td className="px-4 py-3">{item.profile?.full_name ?? "Unknown caregiver"}</td>
                      <td className="px-4 py-3">{item.user?.email ?? "No email"}</td>
                      <td className="px-4 py-3">{formatDate(item.submittedAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`${adminPath(reviewKey, {
                            review: item.docId,
                            q: userSearch || undefined,
                            role_filter: userRoleFilter || undefined,
                          })}#verification`}
                          className="secondary-btn px-3 py-2 text-xs"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReview && (
              <article className="surface-panel mt-6 p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#10233b]">Review Selected Caregiver</h3>
                  <span className="rounded-full border border-[#dce7ee] bg-white px-2.5 py-1 text-xs font-semibold text-[#4d627d]">
                    Submitted {formatDate(selectedReview.submittedAt)}
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-xl border border-[#dce7ee] bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                      Proposed Public Profile
                    </p>
                    <h4 className="mt-2 text-xl font-bold text-[#10243b]">
                      {selectedReview.profile?.full_name ?? "Unknown caregiver"}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-[#54677f]">
                      {selectedReview.profile?.location ?? "Location not set"}
                    </p>
                    <p className="mt-1 text-xs text-[#607187]">
                      {selectedReview.user?.email ?? "No email"}
                    </p>
                    {selectedReview.profile && (
                      <p className="mt-1 text-xs font-semibold text-[#4f6176]">
                        Current tag status:{" "}
                        {licenseStatusLabel(selectedReview.profile.licensed_nurse_status)}
                      </p>
                    )}

                    {selectedReview.profile?.profile_photo_url && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-16 w-16 overflow-hidden rounded-full border border-[#dbe6ee] bg-[#eaf2f8]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedReview.profile.profile_photo_url}
                            alt={`${selectedReview.profile.full_name} profile`}
                            width={64}
                            height={64}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-sm text-[#5b6d81]">Public profile photo preview.</p>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7f94]">
                          {selectedReview.profile
                            ? getRateLabelByCategory(selectedReview.profile.service_category)
                            : "Rate"}
                        </p>
                        <p className="mt-1 text-base font-bold text-[#112842]">
                          {selectedReview.profile
                            ? currencyFormatter.format(selectedReview.profile.hourly_rate)
                            : "Not set"}
                          {selectedReview.profile && (
                            <span className="ml-1">
                              {getRateSuffixByCategory(selectedReview.profile.service_category)}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7f94]">
                          {selectedReview.profile
                            ? CARE_SERVICE_CATEGORY_OPTIONS.find(
                                (option) =>
                                  option.value === selectedReview.profile?.service_category
                              )?.label ?? "Service type"
                            : "Service type"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7f94]">
                          Services
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(selectedReview.profile?.care_specialties ?? []).length > 0 ? (
                            selectedReview.profile?.care_specialties.map((specialty) => (
                              <span
                                key={specialty}
                                className="rounded-full border border-[#d8e3eb] bg-white px-2.5 py-1 text-xs font-semibold text-[#3a5473]"
                              >
                                {specialty}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[#617488]">No services selected</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7f94]">
                          Languages
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(selectedReview.profile?.languages_spoken ?? []).length > 0 ? (
                            selectedReview.profile?.languages_spoken.map((language) => (
                              <span
                                key={language}
                                className="rounded-full border border-[#d8e3eb] bg-white px-2.5 py-1 text-xs font-semibold text-[#3a5473]"
                              >
                                {language}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[#617488]">No languages selected</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a7f94]">
                        Bio
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#56677e]">
                        {selectedReview.profile?.bio ?? "No bio provided."}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#dce7ee] bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                      Uploaded Licence Document
                    </p>
                    <div className="mt-3 rounded-xl border border-[#dde7ee] bg-[#f5f8fb] p-3">
                      {selectedReview.previewUrl ? (
                        selectedReview.documentUrl.toLowerCase().endsWith(".pdf") ? (
                          <a
                            href={selectedReview.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-btn text-sm"
                          >
                            Open uploaded PDF
                          </a>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedReview.previewUrl}
                            alt={`${selectedReview.profile?.full_name ?? "Caregiver"} verification document`}
                            width={1200}
                            height={900}
                            loading="lazy"
                            decoding="async"
                            className="h-80 w-full rounded-lg object-contain"
                          />
                        )
                      ) : (
                        <p className="text-sm text-amber-700">
                          Unable to preview this document. Check file path or storage policy.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <form action={handleVerificationDecision}>
                        <input type="hidden" name="review_key" value={reviewKey} />
                        <input type="hidden" name="doc_id" value={selectedReview.docId} />
                        <input type="hidden" name="user_id" value={selectedReview.userId} />
                        <input
                          type="hidden"
                          name="caregiver_name"
                          value={selectedReview.profile?.full_name ?? "Caregiver"}
                        />
                        <input
                          type="hidden"
                          name="caregiver_email"
                          value={selectedReview.user?.email ?? ""}
                        />
                        <input type="hidden" name="decision" value="approved" />
                        <button type="submit" className="primary-btn w-full text-sm">
                          Approve Licensed Nurse Tag
                        </button>
                      </form>

                      <form action={handleVerificationDecision} className="space-y-2">
                        <input type="hidden" name="review_key" value={reviewKey} />
                        <input type="hidden" name="doc_id" value={selectedReview.docId} />
                        <input type="hidden" name="user_id" value={selectedReview.userId} />
                        <input
                          type="hidden"
                          name="caregiver_name"
                          value={selectedReview.profile?.full_name ?? "Caregiver"}
                        />
                        <input
                          type="hidden"
                          name="caregiver_email"
                          value={selectedReview.user?.email ?? ""}
                        />
                        <input type="hidden" name="decision" value="pending" />
                        <button type="submit" className="outline-btn w-full text-sm">
                          Keep as Pending Review
                        </button>
                      </form>

                      <form action={handleVerificationDecision} className="space-y-2">
                        <input type="hidden" name="review_key" value={reviewKey} />
                        <input type="hidden" name="doc_id" value={selectedReview.docId} />
                        <input type="hidden" name="user_id" value={selectedReview.userId} />
                        <input
                          type="hidden"
                          name="caregiver_name"
                          value={selectedReview.profile?.full_name ?? "Caregiver"}
                        />
                        <input
                          type="hidden"
                          name="caregiver_email"
                          value={selectedReview.user?.email ?? ""}
                        />
                        <input type="hidden" name="decision" value="rejected" />
                        <textarea
                          name="rejection_reason"
                          className="field-textarea min-h-[90px]"
                          placeholder="Reason for rejection (e.g. document is blurry, name mismatch, expired ID)."
                          required
                        />
                        <button type="submit" className="secondary-btn w-full text-sm">
                          Reject Licence (send reason by email)
                        </button>
                      </form>
                    </div>
                  </section>
                </div>
              </article>
            )}
          </>
        )}
      </section>

      <section id="reports" className="surface-panel anchor-target mt-6 p-6 md:p-8">
        <p className="eyebrow">Trust & Safety</p>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#10233b]">
          Report Inbox
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#56677c]">
          Review user-submitted tickets. Evidence view only unlocks for the reported chat thread.
        </p>

        {openReportsError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load report inbox: {openReportsError.message}
          </div>
        )}

        {!openReportsError && reportItems.length === 0 && (
          <div className="mt-4 rounded-xl border border-[#d8e3eb] bg-white/85 px-4 py-3 text-sm text-[#596d84]">
            No active report tickets.
          </div>
        )}

        {!openReportsError && reportItems.length > 0 && (
          <>
            <div className="mt-5 overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eef3f8] text-[#2e4b6a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Reported By</th>
                    <th className="px-4 py-3 text-left font-semibold">Reported User</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((item) => (
                    <tr key={item.report.id} className="border-t border-[#e1e9ef] text-[#2f4a67]">
                      <td className="px-4 py-3">{item.reporter?.email ?? "Unknown"}</td>
                      <td className="px-4 py-3">{item.reported?.email ?? "Unknown"}</td>
                      <td className="px-4 py-3">{normalizeReportReason(item.report.reason)}</td>
                      <td className="px-4 py-3">{formatDate(item.report.created_at)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`${adminPath(reviewKey, { report: item.report.id })}#reports`}
                          className="secondary-btn px-3 py-2 text-xs"
                        >
                          View Ticket
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReport && (
              <article className="surface-panel mt-6 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#10233b]">Ticket Evidence Viewer</h3>
                    <p className="mt-1 text-sm text-[#596d84]">
                      {selectedReport.reporter?.email ?? "Unknown reporter"} reported{" "}
                      {selectedReport.reported?.email ?? "Unknown user"} for{" "}
                      {normalizeReportReason(selectedReport.report.reason)}.
                    </p>
                  </div>
                  <span className="rounded-full border border-[#dce7ee] bg-white px-2.5 py-1 text-xs font-semibold text-[#4d627d]">
                    Open since {formatDate(selectedReport.report.created_at)}
                  </span>
                </div>

                {selectedReport.report.details && (
                  <div className="mt-3 rounded-xl border border-[#dce7ee] bg-white/90 px-4 py-3 text-sm text-[#4f637b]">
                    <p className="font-semibold text-[#2e4b6a]">Reporter details</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedReport.report.details}</p>
                  </div>
                )}

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded-xl border border-[#dce7ee] bg-white/88 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                      Chat Evidence
                    </p>
                    {reportEvidence ? (
                      <>
                        <div className="mt-2 text-xs text-[#617488]">
                          <p>
                            Family: <span className="font-semibold">{reportEvidence.clientName}</span> ({reportEvidence.clientEmail})
                          </p>
                          <p>
                            Caregiver: <span className="font-semibold">{reportEvidence.caregiverName}</span> ({reportEvidence.caregiverEmail})
                          </p>
                        </div>
                        <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-[#dbe6ee] bg-white/80 p-3">
                          {reportEvidence.messages.length === 0 ? (
                            <p className="text-sm text-[#62758d]">No messages found in this thread.</p>
                          ) : (
                            reportEvidence.messages.map((message) => {
                              const senderIsClient = message.sender_user_id === reportEvidence.thread.client_user_id;
                              const senderName = senderIsClient
                                ? reportEvidence.clientName
                                : reportEvidence.caregiverName;

                              return (
                                <article
                                  key={message.id}
                                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-[0_4px_10px_rgba(12,32,50,0.06)] ${
                                    senderIsClient
                                      ? "mr-auto border border-[#d8e3eb] bg-white text-[#243c58]"
                                      : "ml-auto bg-[#0f766e] text-white"
                                  }`}
                                >
                                  <p className="text-xs font-semibold uppercase tracking-[0.06em] opacity-85">
                                    {senderName}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                                    {message.body}
                                  </p>
                                  <p className="mt-1 text-[0.66rem] opacity-80">{formatDate(message.created_at)}</p>
                                </article>
                              );
                            })
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-[#62758d]">
                        Unable to load chat evidence for this ticket.
                      </p>
                    )}
                  </section>

                  <section className="rounded-xl border border-[#dce7ee] bg-white/88 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57708f]">
                      Resolution Actions
                    </p>
                    <form action={handleReportResolution} className="mt-3 space-y-3">
                      <input type="hidden" name="review_key" value={reviewKey} />
                      <input type="hidden" name="report_id" value={selectedReport.report.id} />
                      <textarea
                        name="resolution_notes"
                        className="field-textarea min-h-[110px]"
                        placeholder="Optional internal note about your decision."
                      />
                      <div className="grid gap-2">
                        <button
                          type="submit"
                          name="resolution"
                          value="dismiss"
                          className="secondary-btn w-full text-sm"
                        >
                          Dismiss Ticket
                        </button>
                        <button
                          type="submit"
                          name="resolution"
                          value="suspend"
                          className="secondary-btn w-full border-amber-300 bg-amber-50 text-sm text-amber-800"
                        >
                          Suspend User
                        </button>
                        <button
                          type="submit"
                          name="resolution"
                          value="ban"
                          className="secondary-btn w-full border-red-300 bg-red-50 text-sm text-red-700"
                        >
                          Ban User & Hide Profile
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              </article>
            )}
          </>
        )}
      </section>

      <section id="users" className="surface-panel anchor-target mt-6 p-6 md:p-8">
        <p className="eyebrow">CRM</p>
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#10233b]">
          User Directory
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#56677c]">
          Search all users by name/email/phone and apply manual profile overrides.
        </p>

        {allUsersError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load users: {allUsersError.message}
          </div>
        )}

        {!allUsersError && (
          <>
            <form method="get" className="mt-5 grid gap-3 md:grid-cols-[1.3fr_220px_auto]">
              <input type="hidden" name="key" value={reviewKey} />
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">Search</span>
                <input
                  name="q"
                  defaultValue={userSearch}
                  className="field-input"
                  placeholder="Name, email, phone"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">User Type</span>
                <select name="role_filter" defaultValue={userRoleFilter} className="field-input">
                  <option value="">All users</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="client">Family</option>
                </select>
              </label>
              <button type="submit" className="primary-btn h-[2.9rem] self-end">
                Apply
              </button>
            </form>

            <div className="mt-5 overflow-hidden rounded-xl border border-[#d8e3eb] bg-white/92">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eef3f8] text-[#2e4b6a]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectoryRows.slice(0, 200).map((row) => {
                    const statusLabel = row.user.is_banned
                      ? "Banned"
                      : row.user.is_suspended
                      ? "Suspended"
                      : "Active";

                    return (
                      <tr key={row.user.id} className="border-t border-[#e1e9ef] text-[#2f4a67]">
                        <td className="px-4 py-3">{row.displayName}</td>
                        <td className="px-4 py-3">{row.user.email}</td>
                        <td className="px-4 py-3">
                          {row.user.role === "caregiver" ? "Caregiver" : "Family"}
                        </td>
                        <td className="px-4 py-3">{row.phone || "-"}</td>
                        <td className="px-4 py-3">{statusLabel}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`${adminPath(reviewKey, {
                              user: row.user.id,
                              q: userSearch || undefined,
                              role_filter: userRoleFilter || undefined,
                            })}#users`}
                            className="secondary-btn px-3 py-2 text-xs"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedDirectoryUser && (
              <article className="surface-panel mt-6 p-5 md:p-6">
                <h3 className="text-lg font-bold text-[#10233b]">Profile Override</h3>
                <p className="mt-1 text-sm text-[#5c6f84]">
                  Editing {selectedDirectoryUser.displayName} ({selectedDirectoryUser.user.email})
                </p>

                <form action={handleUserOverride} className="mt-4 space-y-4">
                  <input type="hidden" name="review_key" value={reviewKey} />
                  <input type="hidden" name="user_id" value={selectedDirectoryUser.user.id} />
                  <input type="hidden" name="user_role" value={selectedDirectoryRole} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[#243d58]">Full name</span>
                      <input
                        name="full_name"
                        defaultValue={selectedDirectoryUser.displayName}
                        className="field-input"
                        required
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Phone</span>
                      <input
                        name="phone"
                        defaultValue={selectedClientProfile?.phone ?? ""}
                        className="field-input"
                        placeholder="+65 8123 4567"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Location</span>
                      <input
                        name="location"
                        defaultValue={
                          selectedCaregiverProfile?.location ?? selectedClientProfile?.location ?? ""
                        }
                        className="field-input"
                        placeholder="Bedok"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Account status</span>
                      <select name="account_status" defaultValue={selectedStatus} className="field-input">
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Admin note</span>
                      <input
                        name="admin_note"
                        defaultValue={selectedDirectoryUser.user.moderation_note ?? ""}
                        className="field-input"
                        placeholder="Internal note"
                      />
                    </label>

                    {selectedDirectoryRole === "caregiver" && (
                      <>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[#243d58]">
                            Service type
                          </span>
                          <select
                            name="service_category"
                            defaultValue={selectedCaregiverCategory}
                            className="field-input"
                          >
                            {CARE_SERVICE_CATEGORY_OPTIONS.map((category) => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[#243d58]">
                            {selectedCaregiverRateLabel}
                          </span>
                          <input
                            name="hourly_rate"
                            type="number"
                            min={1}
                            step={1}
                            defaultValue={selectedCaregiverProfile?.hourly_rate ?? 40}
                            className="field-input no-spinner"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold text-[#243d58]">Bio</span>
                          <textarea
                            name="bio"
                            defaultValue={selectedCaregiverProfile?.bio ?? ""}
                            className="field-textarea min-h-[120px]"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold text-[#243d58]">
                            Care specialties (comma separated)
                          </span>
                          <textarea
                            name="care_specialties"
                            defaultValue={(selectedCaregiverProfile?.care_specialties ?? []).join(", ")}
                            className="field-textarea min-h-[100px]"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="text-sm font-semibold text-[#243d58]">
                            Languages spoken (comma separated)
                          </span>
                          <textarea
                            name="languages_spoken"
                            defaultValue={(selectedCaregiverProfile?.languages_spoken ?? []).join(", ")}
                            className="field-textarea min-h-[100px]"
                          />
                        </label>
                        <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-3 py-2 text-sm text-[#4f647c] md:col-span-2">
                          Licensed Nurse status:{" "}
                          <span className="font-semibold text-[#1d3b59]">
                            {licenseStatusLabel(
                              selectedCaregiverProfile?.licensed_nurse_status ??
                                "no_licence_uploaded"
                            )}
                          </span>
                        </p>
                      </>
                    )}
                  </div>

                  <button type="submit" className="primary-btn text-sm">
                    Save Override
                  </button>
                </form>
              </article>
            )}
          </>
        )}
      </section>
    </div>
  );
}
