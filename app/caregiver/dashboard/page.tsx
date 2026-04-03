"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SiteHeader from "@/components/site-header";
import {
  CAREGIVER_LANGUAGE_OPTIONS,
  sanitizeCaregiverLanguages,
} from "@/lib/caregiver-languages";
import {
  SERVICE_REGION_OPTIONS,
  formatServiceRegions,
  parseServiceRegionsFromLocation,
  sanitizeServiceRegions,
} from "@/lib/service-regions";
import { optimizeProfileImage } from "@/lib/profile-image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CaregiverProfile,
  MarketplaceUser,
  VerificationDoc,
} from "@/lib/supabase/types";

const PROFILE_BUCKET = "caregiver-profile-photos";
const DOC_BUCKET = "verification-documents";
const MAX_PROFILE_PHOTO_MB = 5;
const MAX_DOC_MB = 8;

type DashboardForm = {
  fullName: string;
  hourlyRate: string;
  yearsExperience: string;
  credentialsSummary: string;
  availabilitySummary: string;
  responseTimeSummary: string;
  minimumShiftHours: string;
  serviceRegions: string[];
  languages: string[];
  bio: string;
};

type EditableDashboardField = Exclude<
  keyof DashboardForm,
  "serviceRegions" | "languages"
>;

const INITIAL_FORM: DashboardForm = {
  fullName: "",
  hourlyRate: "",
  yearsExperience: "",
  credentialsSummary: "",
  availabilitySummary: "",
  responseTimeSummary: "",
  minimumShiftHours: "",
  serviceRegions: [],
  languages: [],
  bio: "",
};

function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "");
  return safeExtension || "jpg";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CaregiverDashboardPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(
    null
  );
  const [isRoleBlocked, setIsRoleBlocked] = useState(false);
  const [profile, setProfile] = useState<CaregiverProfile | null>(null);
  const [latestDoc, setLatestDoc] = useState<
    Pick<VerificationDoc, "id" | "status" | "created_at"> | null
  >(null);
  const [form, setForm] = useState<DashboardForm>(INITIAL_FORM);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const boostConfirmedRef = useRef(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const verificationInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = getSupabaseBrowserClient();

  async function loadDashboard(user: User) {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, user_id, full_name, service_category, service_categories, bio, years_experience, credentials_summary, availability_summary, response_time_summary, minimum_shift_hours, last_active_at, hourly_rate, home_nursing_rate, home_personal_care_rate, location, care_specialties, languages_spoken, profile_photo_url, is_verified, is_boosted, boost_expires_at, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .returns<CaregiverProfile | null>();

    if (profileError) {
      setErrorMessage(profileError.message);
      return;
    }

    if (profileRow) {
      setProfile(profileRow);
      setForm({
        fullName: profileRow.full_name,
        hourlyRate: String(
          profileRow.home_personal_care_rate ?? profileRow.hourly_rate ?? ""
        ),
        yearsExperience: String(Math.max(0, profileRow.years_experience ?? 0)),
        credentialsSummary: profileRow.credentials_summary ?? "",
        availabilitySummary: profileRow.availability_summary ?? "",
        responseTimeSummary: profileRow.response_time_summary ?? "",
        minimumShiftHours: profileRow.minimum_shift_hours
          ? String(profileRow.minimum_shift_hours)
          : "",
        serviceRegions: parseServiceRegionsFromLocation(profileRow.location),
        languages: sanitizeCaregiverLanguages(profileRow.languages_spoken ?? []),
        bio: profileRow.bio,
      });
    } else {
      setProfile(null);
      setForm((previous) => ({
        ...previous,
        fullName:
          (typeof user.user_metadata.full_name === "string"
            ? user.user_metadata.full_name
            : "") || previous.fullName,
        hourlyRate:
          typeof user.user_metadata.hourly_rate === "number"
            ? String(user.user_metadata.hourly_rate)
            : previous.hourlyRate,
        yearsExperience:
          typeof user.user_metadata.years_experience === "number"
            ? String(Math.max(0, user.user_metadata.years_experience))
            : previous.yearsExperience,
        credentialsSummary:
          (typeof user.user_metadata.credentials_summary === "string"
            ? user.user_metadata.credentials_summary
            : "") || previous.credentialsSummary,
        availabilitySummary:
          (typeof user.user_metadata.availability_summary === "string"
            ? user.user_metadata.availability_summary
            : "") || previous.availabilitySummary,
        responseTimeSummary:
          (typeof user.user_metadata.response_time_summary === "string"
            ? user.user_metadata.response_time_summary
            : "") || previous.responseTimeSummary,
        minimumShiftHours:
          typeof user.user_metadata.minimum_shift_hours === "number"
            ? String(user.user_metadata.minimum_shift_hours)
            : previous.minimumShiftHours,
      }));
    }

    const { data: docRows, error: docError } = await supabase
      .from("verification_docs")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<Pick<VerificationDoc, "id" | "status" | "created_at">[]>();

    if (docError) {
      setErrorMessage(docError.message);
      return;
    }

    setLatestDoc(docRows?.[0] ?? null);
  }

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      setIsBootLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (alive) {
          setErrorMessage(error.message);
          setIsBootLoading(false);
        }
        return;
      }

      const user = data.session?.user ?? null;
      if (!user) {
        router.replace("/login?role=caregiver&next=/caregiver/dashboard");
        return;
      }

      if (!alive) return;
      setAuthUser(user);
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id, role, is_suspended, is_banned")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle();

      if (userError) {
        if (alive) {
          setErrorMessage(userError.message);
          setIsBootLoading(false);
        }
        return;
      }

      if (userRow?.is_banned || userRow?.is_suspended) {
        await supabase.auth.signOut();
        if (alive) {
          setErrorMessage(
            "Your account is currently restricted. Contact support if you believe this is a mistake."
          );
          setIsBootLoading(false);
        }
        return;
      }

      const role = (userRow?.role as MarketplaceUser["role"] | null) ?? "client";
      setAccountRole(role);
      if (role !== "caregiver") {
        if (alive) {
          setIsRoleBlocked(true);
          setIsBootLoading(false);
        }
        return;
      }

      if (alive) {
        setIsRoleBlocked(false);
      }

      await loadDashboard(user);
      if (alive) {
        setIsBootLoading(false);
      }
    }

    void bootstrap();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authUser || boostConfirmedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const boostState = params.get("boost");
    const sessionId = params.get("session_id");

    if (boostState === "cancelled") {
      setSuccessMessage("Boost checkout was cancelled.");
      boostConfirmedRef.current = true;
      return;
    }

    if (boostState !== "success" || !sessionId) {
      return;
    }

    boostConfirmedRef.current = true;
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setErrorMessage("Please log in again to finish boost activation.");
          return;
        }

        const response = await fetch("/api/boost/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const payload = (await response.json()) as {
          error?: string;
          expiresAt?: string;
        };

        if (!response.ok) {
          setErrorMessage(payload.error ?? "Unable to confirm boost payment.");
          return;
        }

        setSuccessMessage(
          payload.expiresAt
            ? `Boost activated until ${formatDate(payload.expiresAt)}.`
            : "Boost activated successfully."
        );
        await loadDashboard(authUser);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unable to confirm boost.";
        setErrorMessage(msg);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const updateField =
    (field: EditableDashboardField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };

  const toggleLanguage = (language: string) => {
    setForm((previous) => {
      const exists = previous.languages.includes(language);
      return {
        ...previous,
        languages: exists
          ? previous.languages.filter((item) => item !== language)
          : [...previous.languages, language],
      };
    });
    setErrorMessage(null);
  };

  const toggleServiceRegion = (region: string) => {
    setForm((previous) => {
      const normalized = sanitizeServiceRegions(previous.serviceRegions);
      const exists = normalized.includes(region);
      const next = exists
        ? normalized.filter((item) => item !== region)
        : sanitizeServiceRegions([...normalized, region]);

      return {
        ...previous,
        serviceRegions: next,
      };
    });
    setErrorMessage(null);
  };

  const onProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProfilePhoto(event.target.files?.[0] ?? null);
  };

  const onVerificationDocChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationDoc(event.target.files?.[0] ?? null);
  };

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!authUser) {
      setErrorMessage("Please log in again.");
      return;
    }

    if (form.fullName.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (form.serviceRegions.length < 1) {
      setErrorMessage("Please select at least one preferred service region.");
      return;
    }

    if (form.bio.trim().length < 20) {
      setErrorMessage("Bio must be at least 20 characters.");
      return;
    }

    const hourlyRate = Number(form.hourlyRate);
    const yearsExperience = Number(form.yearsExperience);
    const minimumShiftHours = Number(form.minimumShiftHours);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      setErrorMessage("Hourly rate must be greater than 0.");
      return;
    }
    if (!Number.isFinite(yearsExperience) || yearsExperience < 0) {
      setErrorMessage("Please enter valid years of experience (0 or more).");
      return;
    }
    if (form.credentialsSummary.trim().length < 8) {
      setErrorMessage("Credentials summary should be at least 8 characters.");
      return;
    }
    if (form.availabilitySummary.trim().length < 5) {
      setErrorMessage("Please enter your availability.");
      return;
    }
    if (form.responseTimeSummary.trim().length < 5) {
      setErrorMessage("Please enter your typical response time.");
      return;
    }
    if (!Number.isFinite(minimumShiftHours) || minimumShiftHours <= 0) {
      setErrorMessage("Minimum shift duration must be greater than 0 hours.");
      return;
    }

    if (form.languages.length < 1) {
      setErrorMessage("Please select at least one spoken language.");
      return;
    }

    if (!profile?.profile_photo_url && !profilePhoto) {
      setErrorMessage("Please upload a profile photo.");
      return;
    }

    if (profilePhoto) {
      if (!profilePhoto.type.startsWith("image/")) {
        setErrorMessage("Profile photo must be an image.");
        return;
      }

      if (profilePhoto.size > MAX_PROFILE_PHOTO_MB * 1024 * 1024) {
        setErrorMessage(`Profile photo must be ${MAX_PROFILE_PHOTO_MB}MB or smaller.`);
        return;
      }
    }

    if (verificationDoc && verificationDoc.size > MAX_DOC_MB * 1024 * 1024) {
      setErrorMessage(`Verification document must be ${MAX_DOC_MB}MB or smaller.`);
      return;
    }

    setIsSaving(true);
    try {
      let profilePhotoUrl = profile?.profile_photo_url ?? "";
      if (profilePhoto) {
        const optimizedProfilePhoto = await optimizeProfileImage(profilePhoto);
        const extension = getFileExtension(optimizedProfilePhoto.name);
        const path = `public/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_BUCKET)
          .upload(path, optimizedProfilePhoto, {
            upsert: false,
            contentType: optimizedProfilePhoto.type || "image/jpeg",
          });

        if (uploadError) {
          setErrorMessage(uploadError.message);
          return;
        }

        const { data: publicData } = supabase.storage
          .from(PROFILE_BUCKET)
          .getPublicUrl(path);
        profilePhotoUrl = publicData.publicUrl;
      }

      let uploadedDocPath: string | null = null;
      if (verificationDoc) {
        const extension = getFileExtension(verificationDoc.name);
        uploadedDocPath = `private/${authUser.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: docUploadError } = await supabase.storage
          .from(DOC_BUCKET)
          .upload(uploadedDocPath, verificationDoc, {
            upsert: false,
            contentType: verificationDoc.type || "application/octet-stream",
          });

        if (docUploadError) {
          setErrorMessage(docUploadError.message);
          return;
        }
      }

      const caregiverServiceCategories = ["home_personal_care"] as const;
      const homeNursingRate = null;
      const homePersonalCareRate = Number(form.hourlyRate);
      const primaryCategory = "home_personal_care" as const;
      const primaryRate = homePersonalCareRate;

      const profilePayload = {
        ...(profile ? { id: profile.id } : {}),
        user_id: authUser.id,
        full_name: form.fullName.trim(),
        service_category: primaryCategory,
        service_categories: [...caregiverServiceCategories],
        bio: form.bio.trim(),
        years_experience: Math.max(0, Math.floor(Number(form.yearsExperience))),
        credentials_summary: form.credentialsSummary.trim(),
        availability_summary: form.availabilitySummary.trim(),
        response_time_summary: form.responseTimeSummary.trim(),
        minimum_shift_hours: Number(form.minimumShiftHours),
        last_active_at: new Date().toISOString(),
        hourly_rate: primaryRate ?? 1,
        home_nursing_rate: homeNursingRate,
        home_personal_care_rate: homePersonalCareRate,
        location: formatServiceRegions(form.serviceRegions),
        care_specialties: [],
        languages_spoken: sanitizeCaregiverLanguages(form.languages),
        profile_photo_url: profilePhotoUrl,
        is_verified: profile?.is_verified ?? false,
      };

      const { data: savedProfile, error: profileSaveError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select(
          "id, user_id, full_name, service_category, service_categories, bio, years_experience, credentials_summary, availability_summary, response_time_summary, minimum_shift_hours, last_active_at, hourly_rate, home_nursing_rate, home_personal_care_rate, location, care_specialties, languages_spoken, profile_photo_url, is_verified, is_boosted, boost_expires_at, created_at, updated_at"
        )
        .limit(1)
        .single()
        .returns<CaregiverProfile>();

      if (profileSaveError || !savedProfile) {
        setErrorMessage(profileSaveError?.message ?? "Unable to save profile.");
        return;
      }

      if (uploadedDocPath) {
        const { error: docInsertError } = await supabase
          .from("verification_docs")
          .insert({
            user_id: authUser.id,
            document_url: uploadedDocPath,
            status: "pending",
          });

        if (docInsertError) {
          setErrorMessage(docInsertError.message);
          return;
        }
      }

      await supabase.auth.updateUser({
        data: {
          full_name: form.fullName.trim(),
          account_type: "caregiver",
          service_category: primaryCategory,
          service_categories: [...caregiverServiceCategories],
          home_nursing_rate: homeNursingRate,
          home_personal_care_rate: homePersonalCareRate,
          years_experience: Math.max(0, Math.floor(Number(form.yearsExperience))),
          credentials_summary: form.credentialsSummary.trim(),
          availability_summary: form.availabilitySummary.trim(),
          response_time_summary: form.responseTimeSummary.trim(),
          minimum_shift_hours: Number(form.minimumShiftHours),
          care_specialties: [],
          languages_spoken: sanitizeCaregiverLanguages(form.languages),
        },
      });

      setProfile(savedProfile);
      setAccountRole("caregiver");
      setSuccessMessage("Profile saved successfully.");
      setProfilePhoto(null);
      setVerificationDoc(null);
      if (profileInputRef.current) profileInputRef.current.value = "";
      if (verificationInputRef.current) verificationInputRef.current.value = "";
      await loadDashboard(authUser);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save profile.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function startBoostCheckout() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!authUser) {
      setErrorMessage("Please log in again.");
      return;
    }

    setIsBoosting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErrorMessage("Please log in again to start checkout.");
        return;
      }

      const response = await fetch("/api/boost/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        setErrorMessage(payload.error ?? "Unable to start Stripe checkout.");
        return;
      }

      window.location.assign(payload.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start boost checkout.";
      setErrorMessage(message);
    } finally {
      setIsBoosting(false);
    }
  }

  async function handleSignOut(redirectTo = "/login") {
    await supabase.auth.signOut();
    router.push(redirectTo);
  }

  if (isBootLoading) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <section className="surface-panel page-enter p-6 text-sm text-[#54677f]">
          Loading caregiver dashboard...
        </section>
      </div>
    );
  }

  if (isRoleBlocked || accountRole !== "caregiver") {
    return (
      <div className="site-shell">
        <SiteHeader />
        <section className="surface-panel page-enter p-6 text-sm text-[#344f6a]">
          <p className="text-base font-semibold text-[#10233b]">
            Caregiver dashboard is only available to caregiver accounts.
          </p>
          <p className="mt-2">
            Sign in with your caregiver account to access profile tools.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void handleSignOut("/login?role=caregiver&next=/caregiver/dashboard")
              }
              className="primary-btn text-sm"
            >
              Sign in as caregiver
            </button>
            <Link href="/directory" className="secondary-btn text-sm">
              Back to directory
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const boostActive =
    !!profile?.is_boosted &&
    !!profile.boost_expires_at &&
    new Date(profile.boost_expires_at).getTime() > Date.now();
  const requiresProfilePhoto = !profile?.profile_photo_url;
  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Caregiver Dashboard</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Manage your profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              Update your public card and boost your visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="secondary-btn text-sm"
          >
            Sign out
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="surface-panel mt-6 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <main className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-panel p-6 md:p-8">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">Full name</span>
                <input
                  value={form.fullName}
                  onChange={updateField("fullName")}
                  className="field-input"
                  placeholder="Jane Smith"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Hourly rate (SGD)
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.hourlyRate}
                  onChange={updateField("hourlyRate")}
                  className="field-input no-spinner"
                  placeholder="45"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Years of caregiving experience
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.yearsExperience}
                  onChange={updateField("yearsExperience")}
                  className="field-input no-spinner"
                  placeholder="5"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Minimum shift duration (hours)
                </span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.minimumShiftHours}
                  onChange={updateField("minimumShiftHours")}
                  className="field-input no-spinner"
                  placeholder="3"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Credentials summary
                </span>
                  <input
                    value={form.credentialsSummary}
                    onChange={updateField("credentialsSummary")}
                    className="field-input"
                    placeholder="Home caregiver with eldercare experience"
                    required
                  />
                </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Availability
                </span>
                <input
                  value={form.availabilitySummary}
                  onChange={updateField("availabilitySummary")}
                  className="field-input"
                  placeholder="Weeknights after 7pm and weekends"
                  required
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Typical response time
                </span>
                <input
                  value={form.responseTimeSummary}
                  onChange={updateField("responseTimeSummary")}
                  className="field-input"
                  placeholder="Usually responds within 1 hour"
                  required
                />
              </label>

              <fieldset className="space-y-2 md:col-span-2">
                <legend className="text-sm font-semibold text-[#243d58]">
                  Preferred service regions
                </legend>
                <div className="space-y-3 rounded-lg border border-[#d8e3eb] bg-white/90 p-3">
                  {SERVICE_REGION_OPTIONS.map((region) => {
                    const checked = form.serviceRegions.includes(region.value);
                    return (
                      <label
                        key={region.value}
                        className="block rounded-md border border-[#e2ebf2] bg-white px-3 py-2"
                      >
                        <span className="flex items-start gap-2 text-sm font-semibold text-[#243d58]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleServiceRegion(region.value)}
                            className="mt-0.5 h-4 w-4 rounded border-[#b3c6d8] text-[#0f766e] focus:ring-[#0f766e]"
                          />
                          <span>{region.value}</span>
                        </span>
                        {region.areas && (
                          <p className="ml-6 mt-1 text-xs leading-5 text-[#5d6d81]">
                            {region.areas}
                          </p>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-[#5d6d81]">
                  Select at least one region.
                </p>
              </fieldset>

              <fieldset className="space-y-2 md:col-span-2">
                <legend className="text-sm font-semibold text-[#243d58]">
                  Languages you speak
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAREGIVER_LANGUAGE_OPTIONS.map((language) => {
                    const checked = form.languages.includes(language);
                    return (
                      <label
                        key={language}
                        className="flex items-center gap-2 rounded-lg border border-[#d8e3eb] bg-white/90 px-3 py-2 text-sm text-[#2f4a67]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLanguage(language)}
                          className="h-4 w-4 rounded border-[#b3c6d8] text-[#0f766e] focus:ring-[#0f766e]"
                        />
                        <span>{language}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-[#5d6d81]">
                  Select at least one language.
                </p>
              </fieldset>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Short bio</span>
              <textarea
                value={form.bio}
                onChange={updateField("bio")}
                className="field-textarea"
                placeholder="Describe your eldercare background, certifications, and availability."
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                Profile photo (public)
              </span>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={onProfilePhotoChange}
                className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                required={requiresProfilePhoto}
              />
              <p className="text-xs text-[#5d6d81]">
                Max {MAX_PROFILE_PHOTO_MB}MB. This image appears on your public
                directory card.{" "}
                {requiresProfilePhoto ? "Required to publish profile." : ""}
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                License / supporting ID (private, optional)
              </span>
              <input
                ref={verificationInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={onVerificationDocChange}
                className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
              />
              <p className="text-xs text-[#5d6d81]">
                Optional private upload for your records.
              </p>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving profile..." : "Save caregiver profile"}
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="surface-panel p-5">
            <h2 className="text-base font-bold text-[#10243b]">Supporting documents</h2>
            <div className="mt-3 space-y-2 text-sm text-[#52657e]">
              <p>
                Latest upload:
                <span className="ml-2 font-semibold text-[#1f3654]">
                  {latestDoc ? latestDoc.status : "No upload yet"}
                </span>
              </p>
              {latestDoc && (
                <p className="text-xs text-[#65778d]">
                  Last upload: {formatDate(latestDoc.created_at)}
                </p>
              )}
            </div>
          </section>

          <section className="surface-panel p-5">
            <h2 className="text-base font-bold text-[#10243b]">Boost profile</h2>
            <p className="mt-2 text-sm leading-6 text-[#56677d]">
              Promote your listing to the top of directory search for 7 days.
            </p>
            <p className="mt-2 text-sm text-[#42556f]">
              Status:{" "}
              {boostActive && profile?.boost_expires_at ? (
                <span className="font-semibold text-[#146943]">
                  Active until {formatDate(profile.boost_expires_at)}
                </span>
              ) : (
                <span className="font-semibold text-[#7a4c1d]">Inactive</span>
              )}
            </p>

            <button
              type="button"
              onClick={startBoostCheckout}
              disabled={isBoosting}
              className="primary-btn mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBoosting
                ? "Opening Stripe checkout..."
                : "Boost profile for 7 days (S$5)"}
            </button>
          </section>

          <section className="surface-panel p-5">
            <h2 className="text-base font-bold text-[#10243b]">Your public page</h2>
            <p className="mt-2 text-sm text-[#56677d]">
              Families browse caregiver profiles in the directory.
            </p>
            <Link href="/directory" className="secondary-btn mt-4 w-full text-sm">
              View directory
            </Link>
          </section>
        </aside>
      </main>
    </div>
  );
}
