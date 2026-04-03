"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type JSX,
  useEffect,
  useRef,
  useState,
} from "react";
import SiteHeader from "@/components/site-header";
import {
  CARE_SERVICE_CATEGORY_OPTIONS,
  type CareServiceCategory,
  getServicesForCategories,
  sanitizeCareServiceCategories,
  sanitizeCareServices,
} from "@/lib/care-services";
import {
  CAREGIVER_LANGUAGE_OPTIONS,
  sanitizeCaregiverLanguages,
} from "@/lib/caregiver-languages";
import {
  SERVICE_REGION_OPTIONS,
  formatServiceRegions,
  sanitizeServiceRegions,
} from "@/lib/service-regions";
import { optimizeProfileImage } from "@/lib/profile-image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AccountType = "caregiver" | "client";

type SignupForm = {
  accountType: AccountType;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  serviceCategories: CareServiceCategory[];
  homeNursingRate: string;
  homePersonalCareRate: string;
  yearsExperience: string;
  credentialsSummary: string;
  availabilitySummary: string;
  minimumShiftHours: string;
  serviceRegions: string[];
  specialties: string[];
  languages: string[];
  bio: string;
};

type EditableSignupField = Exclude<
  keyof SignupForm,
  "accountType" | "serviceCategories" | "serviceRegions" | "specialties" | "languages"
>;

const INITIAL_FORM: SignupForm = {
  accountType: "caregiver",
  fullName: "",
  email: "",
  password: "",
  phone: "",
  serviceCategories: [],
  homeNursingRate: "",
  homePersonalCareRate: "",
  yearsExperience: "",
  credentialsSummary: "",
  availabilitySummary: "",
  minimumShiftHours: "",
  serviceRegions: [],
  specialties: [],
  languages: [],
  bio: "",
};

const MIN_BIO_LENGTH = 20;
const MAX_PROFILE_PHOTO_MB = 5;
const MAX_DOC_MB = 8;
const PROFILE_BUCKET = "caregiver-profile-photos";
const DOC_BUCKET = "verification-documents";

function getReadableSignupError(error: { message: string; code?: string }) {
  if (error.code === "email_address_invalid") {
    return "Please enter a real email address (for example, name@gmail.com).";
  }

  if (error.code === "email_exists") {
    return "An account with this email already exists. Try logging in instead.";
  }

  if (error.code === "signup_disabled") {
    return "Signup is currently disabled in Supabase Auth settings.";
  }

  if (error.code === "captcha_failed") {
    return "Signup failed CAPTCHA validation. Disable CAPTCHA in Supabase Auth or add CAPTCHA support in the form.";
  }

  const lowered = error.message.toLowerCase();
  if (lowered.includes("email rate limit exceeded")) {
    return "Too many signup emails were sent recently. Wait and try again later, or configure custom SMTP in Supabase Auth settings.";
  }

  if (lowered.includes("bucket not found")) {
    return "Upload bucket is missing. Re-run /supabase/schema.sql in Supabase SQL editor.";
  }

  if (lowered.includes("row-level security")) {
    return "Upload permissions are blocked. Re-run /supabase/schema.sql to apply Storage policies.";
  }

  return error.message;
}

function getValidationMessage(
  form: SignupForm,
  profilePhoto: File | null,
  verificationDoc: File | null
): string | null {
  const homeNursingRate = Number(form.homeNursingRate);
  const homePersonalCareRate = Number(form.homePersonalCareRate);
  const yearsExperience = Number(form.yearsExperience);
  const minimumShiftHours = Number(form.minimumShiftHours);
  const isCaregiver = form.accountType === "caregiver";

  if (form.fullName.trim().length < 2) return "Please enter your full name.";
  if (form.email.trim().length < 4) return "Please enter a valid email.";
  if (form.password.length < 8) return "Password must be at least 8 characters.";

  if (!isCaregiver) {
    return null;
  }

  if (form.serviceRegions.length < 1) {
    return "Please select at least one preferred service region.";
  }
  if (form.serviceCategories.length < 1) {
    return "Please select at least one service type.";
  }
  if (form.bio.trim().length < MIN_BIO_LENGTH) {
    return `Bio must be at least ${MIN_BIO_LENGTH} characters.`;
  }
  if (
    form.serviceCategories.includes("home_nursing") &&
    (!Number.isFinite(homeNursingRate) || homeNursingRate <= 0)
  ) {
    return "Home Nursing rate per visit must be greater than 0.";
  }
  if (
    form.serviceCategories.includes("home_personal_care") &&
    (!Number.isFinite(homePersonalCareRate) || homePersonalCareRate <= 0)
  ) {
    return "Home Personal Care hourly rate must be greater than 0.";
  }
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0) {
    return "Please enter valid years of experience (0 or more).";
  }
  if (form.credentialsSummary.trim().length < 8) {
    return "Credentials summary should be at least 8 characters.";
  }
  if (form.availabilitySummary.trim().length < 5) {
    return "Please enter your availability.";
  }
  if (!Number.isFinite(minimumShiftHours) || minimumShiftHours <= 0) {
    return "Minimum shift duration must be greater than 0 hours.";
  }
  if (form.specialties.length < 1) {
    return "Please select at least one care service.";
  }
  if (form.languages.length < 1) {
    return "Please select at least one spoken language.";
  }

  if (!profilePhoto) return "Please upload a profile photo.";
  if (!profilePhoto.type.startsWith("image/")) {
    return "Profile photo must be an image.";
  }
  if (profilePhoto.size > MAX_PROFILE_PHOTO_MB * 1024 * 1024) {
    return `Profile image must be ${MAX_PROFILE_PHOTO_MB}MB or smaller.`;
  }

  if (!verificationDoc) return "Please upload your SNB certificate or student ID.";
  if (
    !verificationDoc.type.startsWith("image/") &&
    verificationDoc.type !== "application/pdf"
  ) {
    return "Verification file must be an image or PDF.";
  }
  if (verificationDoc.size > MAX_DOC_MB * 1024 * 1024) {
    return `Verification file must be ${MAX_DOC_MB}MB or smaller.`;
  }

  return null;
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "");
  return safeExtension || "jpg";
}

export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(INITIAL_FORM);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupBanner, setSignupBanner] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const verificationDocInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "created") {
      setSignupBanner(
        params.get("message") ?? "Account created successfully."
      );
    }
  }, []);

  const updateField =
    (field: EditableSignupField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };

  const updateAccountType = (accountType: AccountType) => {
    setForm((previous) => ({
      ...previous,
      accountType,
    }));
    setErrorMessage(null);
  };

  const toggleServiceCategory = (serviceCategory: CareServiceCategory) => {
    setForm((previous) => {
      const exists = previous.serviceCategories.includes(serviceCategory);
      const nextCategories = sanitizeCareServiceCategories(
        exists
          ? previous.serviceCategories.filter((item) => item !== serviceCategory)
          : [...previous.serviceCategories, serviceCategory]
      );
      return {
        ...previous,
        serviceCategories: nextCategories,
        specialties: sanitizeCareServices(previous.specialties, nextCategories),
      };
    });
    setErrorMessage(null);
  };

  const toggleService = (service: string) => {
    setForm((previous) => {
      if (previous.serviceCategories.length < 1) {
        return previous;
      }
      const exists = previous.specialties.includes(service);
      return {
        ...previous,
        specialties: sanitizeCareServices(
          exists
            ? previous.specialties.filter((item) => item !== service)
            : [...previous.specialties, service],
          previous.serviceCategories
        ),
      };
    });
    setErrorMessage(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSignupBanner(null);

    const validationMessage = getValidationMessage(form, profilePhoto, verificationDoc);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const isCaregiver = form.accountType === "caregiver";

      let profilePhotoUrl = "";
      let verificationDocPath = "";

      if (isCaregiver && profilePhoto && verificationDoc) {
        const optimizedProfilePhoto = await optimizeProfileImage(profilePhoto);
        const photoExtension = getFileExtension(optimizedProfilePhoto.name);
        const profilePath = `public/${Date.now()}-${crypto.randomUUID()}.${photoExtension}`;
        const { error: profileUploadError } = await supabase.storage
          .from(PROFILE_BUCKET)
          .upload(profilePath, optimizedProfilePhoto, {
            upsert: false,
            contentType: optimizedProfilePhoto.type || "image/jpeg",
          });

        if (profileUploadError) {
          setErrorMessage(getReadableSignupError(profileUploadError));
          return;
        }

        const { data: publicData } = supabase.storage
          .from(PROFILE_BUCKET)
          .getPublicUrl(profilePath);
        profilePhotoUrl = publicData.publicUrl;

        const docExtension = getFileExtension(verificationDoc.name);
        verificationDocPath = `private/pending/${Date.now()}-${crypto.randomUUID()}.${docExtension}`;
        const { error: docUploadError } = await supabase.storage
          .from(DOC_BUCKET)
          .upload(verificationDocPath, verificationDoc, {
            upsert: false,
            contentType: verificationDoc.type || "application/octet-stream",
          });

        if (docUploadError) {
          setErrorMessage(getReadableSignupError(docUploadError));
          return;
        }
      }

      const caregiverServiceCategories =
        form.accountType === "caregiver"
          ? sanitizeCareServiceCategories(form.serviceCategories)
          : [];

      if (isCaregiver && caregiverServiceCategories.length < 1) {
        setErrorMessage("Please select at least one service type.");
        return;
      }

      const homeNursingRate =
        isCaregiver && caregiverServiceCategories.includes("home_nursing")
          ? Number(form.homeNursingRate)
          : null;
      const homePersonalCareRate =
        isCaregiver && caregiverServiceCategories.includes("home_personal_care")
          ? Number(form.homePersonalCareRate)
          : null;
      const primaryCategory: CareServiceCategory | null =
        caregiverServiceCategories.includes("home_personal_care")
          ? "home_personal_care"
          : caregiverServiceCategories.includes("home_nursing")
            ? "home_nursing"
            : null;
      const primaryRate =
        primaryCategory === "home_personal_care"
          ? homePersonalCareRate
          : primaryCategory === "home_nursing"
            ? homeNursingRate
            : null;

      const metadata = {
        full_name: form.fullName.trim(),
        account_type: form.accountType,
        ...(form.accountType === "caregiver"
          ? {
              phone: form.phone.trim() || null,
              location: formatServiceRegions(form.serviceRegions),
              hourly_rate: primaryRate ?? 1,
              service_category: primaryCategory,
              service_categories: caregiverServiceCategories,
              home_nursing_rate: homeNursingRate,
              home_personal_care_rate: homePersonalCareRate,
              years_experience: Number(form.yearsExperience),
              credentials_summary: form.credentialsSummary.trim(),
              availability_summary: form.availabilitySummary.trim(),
              minimum_shift_hours: Number(form.minimumShiftHours),
              profile_photo_url: profilePhotoUrl,
              verification_doc_url: verificationDocPath,
              care_specialties: sanitizeCareServices(
                form.specialties,
                caregiverServiceCategories
              ),
              languages_spoken: sanitizeCaregiverLanguages(form.languages),
              bio: form.bio.trim(),
            }
          : {}),
      };

      const { error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: metadata,
        },
      });

      if (error) {
        setErrorMessage(getReadableSignupError(error));
        return;
      }

      setForm(INITIAL_FORM);
      setProfilePhoto(null);
      setVerificationDoc(null);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
      if (verificationDocInputRef.current) verificationDocInputRef.current.value = "";

      if (form.accountType === "client") {
        router.push("/signup-success?role=client");
      } else {
        router.push("/signup-success?role=caregiver");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create account.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signUpWithGoogle() {
    setErrorMessage(null);
    if (form.accountType === "caregiver") {
      setErrorMessage(
        "Offering care accounts must use email/password signup."
      );
      return;
    }
    setIsGoogleSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/oauth-complete?role=${form.accountType}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsGoogleSubmitting(false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start Google signup.";
      setErrorMessage(message);
      setIsGoogleSubmitting(false);
    }
  }

  const isCaregiver = form.accountType === "caregiver";
  const selectedServiceOptions = getServicesForCategories(form.serviceCategories);
  const missingRequiredCaregiverFiles =
    isCaregiver && (!profilePhoto || !verificationDoc);
  const submitDisabled = isSubmitting || missingRequiredCaregiverFiles;

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="page-enter">
        <section className="surface-panel mx-auto max-w-5xl p-6 md:p-8">
          <p className="eyebrow">Silver Directory Signup</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
            Create your account
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#54657b]">
            Complete this one-page signup form. Families can browse and chat with
            caregivers directly. Caregiver profiles are hidden until manual verification.
          </p>

          <div className="mt-6 rounded-xl border border-[#d8e3eb] bg-white/85 p-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#d8e3eb] bg-white/80 p-1">
              <button
                type="button"
                onClick={() => updateAccountType("caregiver")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isCaregiver
                    ? "bg-[#0f766e] text-white"
                    : "text-[#31506f] hover:bg-[#edf3f7]"
                }`}
              >
                I am offering care
              </button>
              <button
                type="button"
                onClick={() => updateAccountType("client")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  !isCaregiver
                    ? "bg-[#0f766e] text-white"
                    : "text-[#31506f] hover:bg-[#edf3f7]"
                }`}
              >
                I am looking for care
              </button>
            </div>

            {!isCaregiver ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={signUpWithGoogle}
                  disabled={isGoogleSubmitting}
                  className="secondary-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGoogleSubmitting
                    ? "Redirecting to Google..."
                    : "Continue with Google"}
                </button>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#d8e3eb]" />
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#70829a]">
                    or create with email
                  </span>
                  <div className="h-px flex-1 bg-[#d8e3eb]" />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Offering care accounts: use email/password signup.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section className="rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
              <h2 className="text-lg font-bold text-[#132f4d]">Account details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  <span className="text-sm font-semibold text-[#243d58]">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    className="field-input"
                    placeholder="jane@domain.com"
                    required
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[#243d58]">
                    Password (min 8 chars)
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={updateField("password")}
                    className="field-input"
                    placeholder="********"
                    minLength={8}
                    required
                  />
                </label>
              </div>
            </section>

            {isCaregiver && (
              <>
                <section className="rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
                  <h2 className="text-lg font-bold text-[#132f4d]">Caregiver profile</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">
                        Phone (optional)
                      </span>
                      <input
                        value={form.phone}
                        onChange={updateField("phone")}
                        className="field-input"
                        placeholder="+65 8123 4567"
                      />
                    </label>

                    <fieldset className="space-y-2 md:col-span-2">
                      <legend className="text-sm font-semibold text-[#243d58]">
                        Service type
                      </legend>
                      <div className="grid gap-3 md:grid-cols-2">
                        {CARE_SERVICE_CATEGORY_OPTIONS.map((category) => {
                          const checked = form.serviceCategories.includes(category.value);
                          return (
                            <label
                              key={category.value}
                              className={`rounded-xl border bg-white/90 p-4 transition ${
                                checked
                                  ? "border-[#0f766e] ring-2 ring-[#b5e5d8]"
                                  : "border-[#d8e3eb]"
                              }`}
                            >
                              <span className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  name="service_categories"
                                  value={category.value}
                                  checked={checked}
                                  onChange={() => toggleServiceCategory(category.value)}
                                  className="mt-0.5 h-4 w-4 border-[#b3c6d8] text-[#0f766e] focus:ring-[#0f766e]"
                                />
                                <span>
                                  <p className="text-sm font-bold text-[#163453]">
                                    {category.label}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-[#5d6d81]">
                                    {category.description}
                                  </p>
                                  <p className="mt-2 text-xs font-semibold text-[#244560]">
                                    {category.rateLabel}
                                  </p>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#5d6d81]">
                                    {category.services.map((service) => (
                                      <li key={service}>{service}</li>
                                    ))}
                                  </ul>
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-[#5d6d81]">
                        Select one or both service types.
                      </p>
                    </fieldset>

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

                    {form.serviceCategories.includes("home_nursing") && (
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-[#243d58]">
                          Home Nursing rate per visit (SGD)
                        </span>
                        <input
                          type="number"
                          value={form.homeNursingRate}
                          onChange={updateField("homeNursingRate")}
                          className="field-input no-spinner"
                          placeholder="120"
                          min={1}
                          step={1}
                          required={isCaregiver}
                        />
                      </label>
                    )}

                    {form.serviceCategories.includes("home_personal_care") && (
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-[#243d58]">
                          Home Personal Care hourly rate (SGD)
                        </span>
                        <input
                          type="number"
                          value={form.homePersonalCareRate}
                          onChange={updateField("homePersonalCareRate")}
                          className="field-input no-spinner"
                          placeholder="45"
                          min={1}
                          step={1}
                          required={isCaregiver}
                        />
                      </label>
                    )}

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">
                        Years of nursing experience
                      </span>
                      <input
                        type="number"
                        value={form.yearsExperience}
                        onChange={updateField("yearsExperience")}
                        className="field-input no-spinner"
                        placeholder="5"
                        min={0}
                        step={1}
                        required={isCaregiver}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">
                        Minimum shift duration (hours)
                      </span>
                      <input
                        type="number"
                        value={form.minimumShiftHours}
                        onChange={updateField("minimumShiftHours")}
                        className="field-input no-spinner"
                        placeholder="3"
                        min={0.5}
                        step={0.5}
                        required={isCaregiver}
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
                        placeholder="RN (SNB), acute ward and dementia care experience"
                        required={isCaregiver}
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
                        required={isCaregiver}
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[#243d58]">Short bio</span>
                      <textarea
                        value={form.bio}
                        onChange={updateField("bio")}
                        className="field-textarea"
                        placeholder="Share your eldercare experience and availability."
                        minLength={MIN_BIO_LENGTH}
                        required={isCaregiver}
                      />
                    </label>

                    <fieldset className="space-y-2 md:col-span-2">
                      <legend className="text-sm font-semibold text-[#243d58]">
                        Services you provide
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedServiceOptions.map((service) => {
                          const checked = form.specialties.includes(service);
                          return (
                            <label
                              key={service}
                              className="flex items-center gap-2 rounded-lg border border-[#d8e3eb] bg-white/90 px-3 py-2 text-sm text-[#2f4a67]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleService(service)}
                                className="h-4 w-4 rounded border-[#b3c6d8] text-[#0f766e] focus:ring-[#0f766e]"
                              />
                              <span>{service}</span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedServiceOptions.length === 0 ? (
                        <p className="text-xs text-[#5d6d81]">
                          Choose at least one service type above to load service options.
                        </p>
                      ) : (
                        <p className="text-xs text-[#5d6d81]">
                          Select at least one service from your chosen type.
                        </p>
                      )}
                    </fieldset>

                    <fieldset className="space-y-2 md:col-span-2">
                      <legend className="text-sm font-semibold text-[#243d58]">
                        Languages you speak
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                </section>

                <section className="rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
                  <h2 className="text-lg font-bold text-[#132f4d]">Verification uploads</h2>
                  <div className="mt-4 space-y-4">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">
                        Profile photo (public, required)
                      </span>
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)}
                        className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                        required={isCaregiver}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">
                        Nursing license / SNB / Student ID (private, required)
                      </span>
                      <input
                        ref={verificationDocInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) =>
                          setVerificationDoc(event.target.files?.[0] ?? null)
                        }
                        className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                        required={isCaregiver}
                      />
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-[#5d6d81]">
                    Caregiver profiles stay hidden until admin verification is approved.
                  </p>
                </section>
              </>
            )}

            {!isCaregiver && (
              <section className="rounded-xl border border-[#d9e4ec] bg-[#f4f8fb] p-4 text-sm text-[#4f657f]">
                Families can browse the directory and start direct chats with caregivers.
              </section>
            )}

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {signupBanner && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {signupBanner}
              </p>
            )}

            {missingRequiredCaregiverFiles && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Upload both required files before creating a caregiver account.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d8e3eb] pt-4">
              <p className="text-xs leading-5 text-[#5d6d81]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[#1f6b93]">
                  Sign in
                </Link>
              </p>
              <button
                type="submit"
                disabled={submitDisabled}
                className="primary-btn min-w-[220px] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
