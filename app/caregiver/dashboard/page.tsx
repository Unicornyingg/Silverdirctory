"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import OnboardingStepper from "@/components/onboarding-stepper";
import SiteHeader from "@/components/site-header";
import {
  statusDescription,
  statusLabel,
  type CaregiverLicenseStatus,
} from "@/lib/caregiver-license-status";
import { CARE_SERVICE_OPTIONS, sanitizeCareServices } from "@/lib/care-services";
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
const MIN_BIO_LENGTH = 20;
const MIN_CREDENTIALS_SUMMARY_LENGTH = 8;
const MIN_AVAILABILITY_SUMMARY_LENGTH = 5;
const MIN_RESPONSE_TIME_SUMMARY_LENGTH = 5;

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
  services: string[];
  bio: string;
};

type EditableDashboardField = Exclude<
  keyof DashboardForm,
  "serviceRegions" | "languages" | "services"
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
  services: [],
  bio: "",
};

function getDraftStorageKey(userId: string): string {
  return `caregiver_profile_draft_v1:${userId}`;
}

function readFormDraft(userId: string): DashboardForm | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getDraftStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardForm>;
    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.hourlyRate !== "string" ||
      typeof parsed.yearsExperience !== "string" ||
      typeof parsed.credentialsSummary !== "string" ||
      typeof parsed.availabilitySummary !== "string" ||
      typeof parsed.responseTimeSummary !== "string" ||
      typeof parsed.minimumShiftHours !== "string" ||
      !Array.isArray(parsed.serviceRegions) ||
      !Array.isArray(parsed.languages) ||
      !Array.isArray(parsed.services) ||
      typeof parsed.bio !== "string"
    ) {
      return null;
    }

    return {
      fullName: parsed.fullName,
      hourlyRate: parsed.hourlyRate,
      yearsExperience: parsed.yearsExperience,
      credentialsSummary: parsed.credentialsSummary,
      availabilitySummary: parsed.availabilitySummary,
      responseTimeSummary: parsed.responseTimeSummary,
      minimumShiftHours: parsed.minimumShiftHours,
      serviceRegions: sanitizeServiceRegions(
        parsed.serviceRegions.filter((value): value is string => typeof value === "string")
      ),
      languages: sanitizeCaregiverLanguages(
        parsed.languages.filter((value): value is string => typeof value === "string")
      ),
      services: sanitizeCareServices(
        parsed.services.filter((value): value is string => typeof value === "string")
      ),
      bio: parsed.bio,
    };
  } catch {
    return null;
  }
}

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
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const verificationInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = getSupabaseBrowserClient();

  async function loadDashboard(user: User): Promise<boolean> {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, user_id, full_name, service_category, service_categories, bio, years_experience, credentials_summary, availability_summary, response_time_summary, minimum_shift_hours, last_active_at, hourly_rate, home_nursing_rate, home_personal_care_rate, location, care_specialties, languages_spoken, profile_photo_url, licensed_nurse_status, is_verified, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .returns<CaregiverProfile | null>();

    if (profileError) {
      setErrorMessage(profileError.message);
      return false;
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
        services: sanitizeCareServices(profileRow.care_specialties ?? []),
        bio: profileRow.bio,
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(getDraftStorageKey(user.id));
      }
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
        services: Array.isArray(user.user_metadata.care_specialties)
          ? sanitizeCareServices(
              user.user_metadata.care_specialties.filter(
                (value): value is string => typeof value === "string"
              )
            )
          : previous.services,
      }));

      const draft = readFormDraft(user.id);
      if (draft) {
        setForm((previous) => ({
          ...previous,
          ...draft,
        }));
      }
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
      return !!profileRow;
    }

    setLatestDoc(docRows?.[0] ?? null);
    return !!profileRow;
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

      const hasProfile = await loadDashboard(user);
      const setupRequested =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("setup") === "1";
      if (alive) {
        setIsOnboardingMode(setupRequested || !hasProfile);
      }
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
    if (!authUser) return;
    if (typeof window === "undefined") return;
    if (!isOnboardingMode) return;

    window.localStorage.setItem(getDraftStorageKey(authUser.id), JSON.stringify(form));
  }, [authUser, form, isOnboardingMode]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

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

  const toggleService = (service: string) => {
    setForm((previous) => {
      const exists = previous.services.includes(service);
      return {
        ...previous,
        services: exists
          ? previous.services.filter((item) => item !== service)
          : [...previous.services, service],
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

    if (form.bio.trim().length < MIN_BIO_LENGTH) {
      setErrorMessage(`Bio must be at least ${MIN_BIO_LENGTH} characters.`);
      return;
    }

    const hourlyRate = Number(form.hourlyRate);
    const yearsExperience = Number(form.yearsExperience);
    const hasYearsExperience = form.yearsExperience.trim().length > 0;
    const minimumShiftHours = Number(form.minimumShiftHours);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      setErrorMessage("Hourly rate must be greater than 0.");
      return;
    }
    if (!hasYearsExperience || !Number.isFinite(yearsExperience) || yearsExperience < 0) {
      setErrorMessage("Please enter valid years of experience (0 or more).");
      return;
    }
    if (form.credentialsSummary.trim().length < MIN_CREDENTIALS_SUMMARY_LENGTH) {
      setErrorMessage(
        `Credentials summary should be at least ${MIN_CREDENTIALS_SUMMARY_LENGTH} characters.`
      );
      return;
    }
    if (form.availabilitySummary.trim().length < MIN_AVAILABILITY_SUMMARY_LENGTH) {
      setErrorMessage("Please enter your availability.");
      return;
    }
    if (form.responseTimeSummary.trim().length < MIN_RESPONSE_TIME_SUMMARY_LENGTH) {
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

    if (form.services.length < 1) {
      setErrorMessage("Please select at least one service you provide.");
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
        care_specialties: sanitizeCareServices(form.services),
        languages_spoken: sanitizeCaregiverLanguages(form.languages),
        profile_photo_url: profilePhotoUrl,
        licensed_nurse_status: uploadedDocPath
          ? "licence_submitted"
          : profile?.licensed_nurse_status ?? "no_licence_uploaded",
        is_verified: profile?.is_verified ?? true,
      };

      const { data: savedProfile, error: profileSaveError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" })
        .select(
          "id, user_id, full_name, service_category, service_categories, bio, years_experience, credentials_summary, availability_summary, response_time_summary, minimum_shift_hours, last_active_at, hourly_rate, home_nursing_rate, home_personal_care_rate, location, care_specialties, languages_spoken, profile_photo_url, licensed_nurse_status, is_verified, created_at, updated_at"
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
          onboarding_stage: "profile_completed",
          service_category: primaryCategory,
          service_categories: [...caregiverServiceCategories],
          home_nursing_rate: homeNursingRate,
          home_personal_care_rate: homePersonalCareRate,
          years_experience: Math.max(0, Math.floor(Number(form.yearsExperience))),
          credentials_summary: form.credentialsSummary.trim(),
          availability_summary: form.availabilitySummary.trim(),
          response_time_summary: form.responseTimeSummary.trim(),
          minimum_shift_hours: Number(form.minimumShiftHours),
          care_specialties: sanitizeCareServices(form.services),
          languages_spoken: sanitizeCaregiverLanguages(form.languages),
        },
      });

      setProfile(savedProfile);
      setAccountRole("caregiver");
      setIsOnboardingMode(false);
      setSuccessMessage("Profile saved successfully.");
      setProfilePhoto(null);
      setVerificationDoc(null);
      if (profileInputRef.current) profileInputRef.current.value = "";
      if (verificationInputRef.current) verificationInputRef.current.value = "";
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(getDraftStorageKey(authUser.id));
      }
      await loadDashboard(authUser);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save profile.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
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
        <section className="surface-panel page-enter space-y-4 p-6">
          <div className="h-5 w-44 animate-pulse rounded-md bg-[#e3ebf2]" />
          <div className="h-9 w-64 animate-pulse rounded-md bg-[#dbe6ef]" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-24 animate-pulse rounded-xl border border-[#d8e3eb] bg-white/80" />
            <div className="h-24 animate-pulse rounded-xl border border-[#d8e3eb] bg-white/80" />
          </div>
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

  const requiresProfilePhoto = !profile?.profile_photo_url;
  const licenseStatus: CaregiverLicenseStatus =
    profile?.licensed_nurse_status ?? "no_licence_uploaded";

  const checklistItems = [
    { id: "full-name", label: "Full name", done: form.fullName.trim().length >= 2 },
    {
      id: "hourly-rate",
      label: "Hourly rate",
      done: Number.isFinite(Number(form.hourlyRate)) && Number(form.hourlyRate) > 0,
    },
    {
      id: "experience",
      label: "Years of experience",
      done: form.yearsExperience.trim().length > 0 && Number(form.yearsExperience) >= 0,
    },
    {
      id: "min-shift",
      label: "Minimum shift duration",
      done: Number.isFinite(Number(form.minimumShiftHours)) && Number(form.minimumShiftHours) > 0,
    },
    {
      id: "credentials",
      label: "Credentials summary",
      done: form.credentialsSummary.trim().length >= MIN_CREDENTIALS_SUMMARY_LENGTH,
    },
    {
      id: "availability",
      label: "Availability summary",
      done: form.availabilitySummary.trim().length >= MIN_AVAILABILITY_SUMMARY_LENGTH,
    },
    {
      id: "response-time",
      label: "Response time",
      done: form.responseTimeSummary.trim().length >= MIN_RESPONSE_TIME_SUMMARY_LENGTH,
    },
    { id: "regions", label: "Service regions", done: form.serviceRegions.length > 0 },
    { id: "languages", label: "Languages", done: form.languages.length > 0 },
    { id: "services", label: "Services", done: form.services.length > 0 },
    { id: "bio", label: "Bio", done: form.bio.trim().length >= MIN_BIO_LENGTH },
    { id: "photo", label: "Profile photo", done: !requiresProfilePhoto || !!profilePhoto },
  ];
  const completedChecklist = checklistItems.filter((item) => item.done).length;
  const checklistProgress = Math.round((completedChecklist / checklistItems.length) * 100);
  const checklistRemaining = checklistItems.length - completedChecklist;
  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              {isOnboardingMode ? "Caregiver Onboarding" : "Caregiver Dashboard"}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              {isOnboardingMode ? "Complete your caregiver profile setup" : "Manage your profile"}
            </h1>
            {isOnboardingMode && <OnboardingStepper currentStep={3} className="mt-4" />}
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              {isOnboardingMode
                ? "Stage 3 of 3: add your caregiver details. Your profile is listed as a basic caregiver profile once saved."
                : "Update your public listing and profile settings."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/chats" className="secondary-btn text-sm">
              Open inbox
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="secondary-btn text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="surface-panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[#10233b]">Profile setup progress</h2>
          <span className="rounded-full border border-[#dbe6ee] bg-white px-4 py-1.5 text-sm font-bold text-[#294765]">
            {checklistProgress}% complete
          </span>
        </div>
        <p className="mt-2 text-sm text-[#56677c]">
          {checklistRemaining > 0
            ? `${checklistRemaining} profile item${checklistRemaining === 1 ? "" : "s"} remaining for a complete listing.`
            : "All profile checklist items are completed."}
        </p>
        <div className="mt-4 h-4 overflow-hidden rounded-full border border-[#d8e3eb] bg-[#eaf1f7]">
          <div
            className="h-full bg-gradient-to-r from-[#4338ca] to-[#4f46e5] transition-all"
            style={{ width: `${checklistProgress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[#60758f]">
          Draft changes are saved locally on this device while you complete setup.
        </p>
        {checklistRemaining > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {checklistItems
              .filter((item) => !item.done)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(item.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="rounded-full border border-[#cfdbeb] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#2e4f6f] hover:border-[#b4c6dc] hover:bg-[#f5f9fc]"
                >
                  Complete: {item.label}
                </button>
              ))}
          </div>
        )}
      </section>

      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="surface-panel mt-6 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      <main className="mt-6 grid gap-5 md:grid-cols-[1fr_280px] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-panel p-6 md:p-8">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <fieldset className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 md:p-5">
              <legend className="px-1 text-base font-bold text-[#1d3b59]">Rates &amp; Experience</legend>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Full name</span>
                  <input
                    id="full-name"
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    className="field-input"
                    placeholder="Jane Smith"
                    required
                    autoComplete="name"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Hourly rate (SGD)</span>
                  <input
                    id="hourly-rate"
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
                    id="experience"
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
                    id="min-shift"
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
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 md:p-5">
              <legend className="px-1 text-base font-bold text-[#1d3b59]">
                Availability &amp; Response
              </legend>
              <div className="mt-2 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Availability</span>
                  <input
                    id="availability"
                    value={form.availabilitySummary}
                    onChange={updateField("availabilitySummary")}
                    className="field-input"
                    placeholder="Weeknights after 7pm and weekends"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Typical response time</span>
                  <input
                    id="response-time"
                    value={form.responseTimeSummary}
                    onChange={updateField("responseTimeSummary")}
                    className="field-input"
                    placeholder="Usually responds within 1 hour"
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 md:p-5">
              <legend className="px-1 text-base font-bold text-[#1d3b59]">
                Regions, Languages &amp; Services
              </legend>
              <div className="mt-2 space-y-4">
                <div id="regions" className="space-y-2">
                  <p className="text-sm font-semibold text-[#243d58]">Preferred service regions</p>
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
                              className="mt-0.5 h-4 w-4 rounded border-[#b3c6d8] text-[#4338ca] focus:ring-[#4338ca]"
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
                  <p className="text-xs text-[#5d6d81]">Select at least one region.</p>
                </div>

                <div id="languages" className="space-y-2">
                  <p className="text-sm font-semibold text-[#243d58]">Languages you speak</p>
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
                            className="h-4 w-4 rounded border-[#b3c6d8] text-[#4338ca] focus:ring-[#4338ca]"
                          />
                          <span>{language}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#5d6d81]">Select at least one language.</p>
                </div>

                <div id="services" className="space-y-2">
                  <p className="text-sm font-semibold text-[#243d58]">Services you want to provide</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CARE_SERVICE_OPTIONS.map((service) => {
                      const checked = form.services.includes(service);
                      return (
                        <label
                          key={service}
                          className="flex items-start gap-2 rounded-lg border border-[#d8e3eb] bg-white/90 px-3 py-2 text-sm text-[#2f4a67]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(service)}
                            className="mt-0.5 h-4 w-4 rounded border-[#b3c6d8] text-[#4338ca] focus:ring-[#4338ca]"
                          />
                          <span>{service}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#5d6d81]">Select at least one service.</p>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 md:p-5">
              <legend className="px-1 text-base font-bold text-[#1d3b59]">About you</legend>
              <div className="mt-2 space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Credentials summary</span>
                  <input
                    id="credentials"
                    value={form.credentialsSummary}
                    onChange={updateField("credentialsSummary")}
                    className="field-input"
                    placeholder="Home caregiver with eldercare experience"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Short bio</span>
                  <textarea
                    id="bio"
                    value={form.bio}
                    onChange={updateField("bio")}
                    className="field-textarea"
                    placeholder="Describe your eldercare background, certifications, and availability."
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 md:p-5">
              <legend className="px-1 text-base font-bold text-[#1d3b59]">Verification</legend>
              <div className="mt-2 space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Profile photo (public)</span>
                  <input
                    id="photo"
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onProfilePhotoChange}
                    className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                  />
                  <p className="text-xs text-[#5d6d81]">
                    Max {MAX_PROFILE_PHOTO_MB}MB. This image appears on your public directory card.{" "}
                    {requiresProfilePhoto
                      ? "Recommended for trust and better response rates."
                      : "You can replace this any time."}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">
                    Nursing licence / SNB document (optional)
                  </span>
                  <input
                    ref={verificationInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={onVerificationDocChange}
                    className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                  />
                  <p className="text-xs text-[#5d6d81]">
                    Optional. Uploading a licence requests admin review for a public{" "}
                    <span className="font-semibold">Licensed Nurse</span> tag. Your basic caregiver
                    profile remains live while review is pending.
                  </p>
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={isSaving}
              className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving profile..." : "Save caregiver profile"}
            </button>
          </form>
        </section>

        <aside className="order-first space-y-5 md:order-last">
          <section className="surface-panel p-5">
            <h2 className="text-base font-bold text-[#10243b]">Licensed Nurse tag status</h2>
            <div className="mt-3 space-y-2 text-sm text-[#52657e]">
              <p>
                Current status:
                <span className="ml-2 font-semibold text-[#1f3654]">
                  {statusLabel(licenseStatus)}
                </span>
              </p>
              <p className="text-xs text-[#5f7289]">{statusDescription(licenseStatus)}</p>
              {latestDoc && (
                <p className="text-xs text-[#65778d]">
                  Last upload: {formatDate(latestDoc.created_at)}
                </p>
              )}
            </div>
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
