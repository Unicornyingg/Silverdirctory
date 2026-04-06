"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type JSX,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SiteHeader from "@/components/site-header";
import { CARE_SERVICE_OPTIONS, sanitizeCareServices } from "@/lib/care-services";
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
  hourlyRate: string;
  yearsExperience: string;
  credentialsSummary: string;
  availabilitySummary: string;
  minimumShiftHours: string;
  serviceRegions: string[];
  languages: string[];
  services: string[];
  bio: string;
};

type PendingOtpSignup = {
  accountType: AccountType;
  phone: string;
  email: string;
  metadata: Record<string, unknown>;
};

type EditableSignupField = Exclude<
  keyof SignupForm,
  "accountType" | "serviceRegions" | "languages" | "services"
>;

const INITIAL_FORM: SignupForm = {
  accountType: "caregiver",
  fullName: "",
  email: "",
  password: "",
  phone: "",
  hourlyRate: "",
  yearsExperience: "",
  credentialsSummary: "",
  availabilitySummary: "",
  minimumShiftHours: "",
  serviceRegions: [],
  languages: [],
  services: [],
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
  const hourlyRate = Number(form.hourlyRate);
  const yearsExperience = Number(form.yearsExperience);
  const hasYearsExperience = form.yearsExperience.trim().length > 0;
  const minimumShiftHours = Number(form.minimumShiftHours);
  const isCaregiver = form.accountType === "caregiver";

  if (form.fullName.trim().length < 2) return "Please enter your full name.";
  if (form.email.trim().length < 4) return "Please enter a valid email.";
  if (form.password.length < 8) return "Password must be at least 8 characters.";

  if (!isCaregiver) {
    if (form.phone.trim().length < 6) {
      return "Please enter your phone number.";
    }
    return null;
  }
  if (form.phone.trim().length < 6) {
    return "Please enter your phone number.";
  }

  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    return "Hourly rate must be greater than 0.";
  }
  if (form.serviceRegions.length < 1) {
    return "Please select at least one preferred service region.";
  }
  if (form.bio.trim().length < MIN_BIO_LENGTH) {
    return `Bio must be at least ${MIN_BIO_LENGTH} characters.`;
  }
  if (!hasYearsExperience || !Number.isFinite(yearsExperience) || yearsExperience < 0) {
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
  if (form.languages.length < 1) {
    return "Please select at least one spoken language.";
  }
  if (form.services.length < 1) {
    return "Please select at least one service you provide.";
  }

  if (!profilePhoto) return "Please upload a profile photo.";
  if (!profilePhoto.type.startsWith("image/")) {
    return "Profile photo must be an image.";
  }
  if (profilePhoto.size > MAX_PROFILE_PHOTO_MB * 1024 * 1024) {
    return `Profile image must be ${MAX_PROFILE_PHOTO_MB}MB or smaller.`;
  }

  if (verificationDoc) {
    if (
      !verificationDoc.type.startsWith("image/") &&
      verificationDoc.type !== "application/pdf"
    ) {
      return "Supporting document must be an image or PDF.";
    }
    if (verificationDoc.size > MAX_DOC_MB * 1024 * 1024) {
      return `Supporting document must be ${MAX_DOC_MB}MB or smaller.`;
    }
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupBanner, setSignupBanner] = useState<string | null>(null);
  const [pendingOtpSignup, setPendingOtpSignup] = useState<PendingOtpSignup | null>(
    null
  );
  const [otpCode, setOtpCode] = useState("");
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const verificationDocInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "created") {
      setSignupBanner(params.get("message") ?? "Account created successfully.");
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
    setPendingOtpSignup(null);
    setOtpCode("");
    setErrorMessage(null);
    setSignupBanner(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSignupBanner(null);

    const supabase = getSupabaseBrowserClient();
    const isCaregiver = form.accountType === "caregiver";

    if (pendingOtpSignup && pendingOtpSignup.accountType === form.accountType) {
      const submittedOtpCode = otpCode.trim();
      if (submittedOtpCode.length < 4) {
        setErrorMessage("Enter the SMS verification code sent to your phone.");
        return;
      }

      setIsSubmitting(true);
      try {
        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          phone: pendingOtpSignup.phone,
          token: submittedOtpCode,
          type: "sms",
        });

        if (otpError) {
          setErrorMessage(getReadableSignupError(otpError));
          return;
        }

        if (!otpData.user) {
          setErrorMessage("Unable to verify SMS code. Please try again.");
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          email: pendingOtpSignup.email,
          data: pendingOtpSignup.metadata,
        });

        if (updateError) {
          setErrorMessage(getReadableSignupError(updateError));
          return;
        }

        const completedAccountType = pendingOtpSignup.accountType;
        setPendingOtpSignup(null);
        setOtpCode("");
        setForm(INITIAL_FORM);
        setProfilePhoto(null);
        setVerificationDoc(null);
        if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
        if (verificationDocInputRef.current) verificationDocInputRef.current.value = "";
        router.push(
          completedAccountType === "caregiver"
            ? "/signup-success?role=caregiver&instant=1"
            : "/signup-success?role=client"
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to verify signup code.";
        setErrorMessage(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const validationMessage = getValidationMessage(form, profilePhoto, verificationDoc);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isCaregiver) {
        const normalizedPhone = form.phone.trim();
        const normalizedEmail = form.email.trim().toLowerCase();
        const clientMetadata = {
          full_name: form.fullName.trim(),
          account_type: "client" as const,
          phone: normalizedPhone,
          location: null,
          contact_email: normalizedEmail,
        };

        const { error } = await supabase.auth.signUp({
          phone: normalizedPhone,
          password: form.password,
          options: {
            channel: "sms",
            data: clientMetadata,
          },
        });

        if (error) {
          setErrorMessage(getReadableSignupError(error));
          return;
        }

        setPendingOtpSignup({
          accountType: "client",
          phone: normalizedPhone,
          email: normalizedEmail,
          metadata: clientMetadata,
        });
        setOtpCode("");
        setSignupBanner(
          `We sent a verification code to ${normalizedPhone}. Enter it below to finish account creation.`
        );
        return;
      }

      let profilePhotoUrl = "";
      let verificationDocPath = "";

      if (profilePhoto) {
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

        if (verificationDoc) {
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
      }

      const normalizedPhone = form.phone.trim();
      const normalizedEmail = form.email.trim().toLowerCase();
      const caregiverMetadata = {
        full_name: form.fullName.trim(),
        account_type: "caregiver" as const,
        contact_email: normalizedEmail,
        phone: normalizedPhone,
        location: formatServiceRegions(form.serviceRegions),
        hourly_rate: Number(form.hourlyRate),
        service_category: "home_personal_care",
        service_categories: ["home_personal_care"],
        home_nursing_rate: null,
        home_personal_care_rate: Number(form.hourlyRate),
        years_experience: Number(form.yearsExperience),
        credentials_summary: form.credentialsSummary.trim(),
        availability_summary: form.availabilitySummary.trim(),
        minimum_shift_hours: Number(form.minimumShiftHours),
        profile_photo_url: profilePhotoUrl,
        ...(verificationDocPath ? { verification_doc_url: verificationDocPath } : {}),
        care_specialties: sanitizeCareServices(form.services),
        languages_spoken: sanitizeCaregiverLanguages(form.languages),
        bio: form.bio.trim(),
      };

      const { error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password: form.password,
        options: {
          channel: "sms",
          data: caregiverMetadata,
        },
      });

      if (error) {
        setErrorMessage(getReadableSignupError(error));
        return;
      }

      setPendingOtpSignup({
        accountType: "caregiver",
        phone: normalizedPhone,
        email: normalizedEmail,
        metadata: caregiverMetadata,
      });
      setOtpCode("");
      setSignupBanner(
        `We sent a verification code to ${normalizedPhone}. Enter it below to finish account creation.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create account.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCaregiver = form.accountType === "caregiver";
  const isOtpStep = pendingOtpSignup?.accountType === form.accountType;
  const missingRequiredCaregiverFiles = isCaregiver && !profilePhoto;
  const submitDisabled =
    isSubmitting ||
    missingRequiredCaregiverFiles ||
    (isOtpStep && otpCode.trim().length < 4);
  const caregiverProgressChecks = useMemo(() => {
    if (!isCaregiver) return [];

    const hourlyRate = Number(form.hourlyRate);
    const yearsExperience = Number(form.yearsExperience);
    const hasYearsExperience = form.yearsExperience.trim().length > 0;
    const minimumShiftHours = Number(form.minimumShiftHours);
    const hasValidProfilePhoto =
      !!profilePhoto &&
      profilePhoto.type.startsWith("image/") &&
      profilePhoto.size <= MAX_PROFILE_PHOTO_MB * 1024 * 1024;

    return [
      { id: "full-name", label: "Full name", done: form.fullName.trim().length >= 2 },
      { id: "email", label: "Email address", done: form.email.trim().length >= 4 },
      { id: "password", label: "Password (8+ chars)", done: form.password.length >= 8 },
      { id: "rate", label: "Hourly rate", done: Number.isFinite(hourlyRate) && hourlyRate > 0 },
      {
        id: "experience",
        label: "Years of experience",
        done: hasYearsExperience && Number.isFinite(yearsExperience) && yearsExperience >= 0,
      },
      {
        id: "min-shift",
        label: "Minimum shift duration",
        done: Number.isFinite(minimumShiftHours) && minimumShiftHours > 0,
      },
      {
        id: "credentials",
        label: "Credentials summary",
        done: form.credentialsSummary.trim().length >= 8,
      },
      {
        id: "availability",
        label: "Availability summary",
        done: form.availabilitySummary.trim().length >= 5,
      },
      {
        id: "regions",
        label: "Preferred service regions",
        done: form.serviceRegions.length > 0,
      },
      {
        id: "languages",
        label: "Languages spoken",
        done: form.languages.length > 0,
      },
      {
        id: "services",
        label: "Services provided",
        done: form.services.length > 0,
      },
      {
        id: "bio",
        label: `Short bio (${MIN_BIO_LENGTH}+ chars)`,
        done: form.bio.trim().length >= MIN_BIO_LENGTH,
      },
      { id: "photo", label: "Profile photo uploaded", done: hasValidProfilePhoto },
    ];
  }, [form, isCaregiver, profilePhoto]);
  const caregiverChecklistCompleteCount = caregiverProgressChecks.filter(
    (item) => item.done
  ).length;
  const caregiverProgressPercent = caregiverProgressChecks.length
    ? Math.round((caregiverChecklistCompleteCount / caregiverProgressChecks.length) * 100)
    : 0;
  const caregiverProgressRemaining = caregiverProgressChecks.length - caregiverChecklistCompleteCount;

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
            Complete this one-page signup form. Caregiver profiles are listed immediately after
            account creation.
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

            <div className="mt-4 rounded-lg border border-[#d8e3eb] bg-[#f4f8fb] px-3 py-2 text-sm text-[#4f657f]">
              {isCaregiver
                ? "Caregiver account creation requires phone number, email, password, and SMS verification."
                : "Family account creation requires phone number, email, password, and SMS verification."}
            </div>
          </div>

          {isCaregiver && (
            <section className="mt-6 rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#132f4d]">Caregiver profile progress</h2>
                <p className="rounded-full border border-[#cde0ec] bg-[#edf4f9] px-3 py-1 text-xs font-semibold text-[#2d516f]">
                  {caregiverProgressPercent}% complete
                </p>
              </div>

              <p className="mt-2 text-sm text-[#55677e]">
                {caregiverProgressRemaining > 0
                  ? `${caregiverProgressRemaining} required item${
                      caregiverProgressRemaining === 1 ? "" : "s"
                    } remaining before you can submit.`
                  : "All required items are completed."}
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full border border-[#cfe0ec] bg-[#eaf1f6]">
                <div
                  className="h-full bg-gradient-to-r from-[#0f766e] to-[#159287] transition-all"
                  style={{ width: `${caregiverProgressPercent}%` }}
                />
              </div>
            </section>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section className="rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
              <h2 className="text-lg font-bold text-[#132f4d]">Account details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Full name</span>
                  <input
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    disabled={isOtpStep}
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
                    disabled={isOtpStep}
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
                    disabled={isOtpStep}
                    className="field-input"
                    placeholder="********"
                    minLength={8}
                    required
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[#243d58]">Phone number</span>
                  <input
                    value={form.phone}
                    onChange={updateField("phone")}
                    disabled={isOtpStep}
                    className="field-input"
                    placeholder="+65 8123 4567"
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
                      <span className="text-sm font-semibold text-[#243d58]">Hourly rate (SGD)</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.hourlyRate}
                        onChange={updateField("hourlyRate")}
                        className="field-input no-spinner"
                        placeholder="45"
                        required={isCaregiver}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Years of experience</span>
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
                      <span className="text-sm font-semibold text-[#243d58]">Minimum shift duration (hours)</span>
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
                      <span className="text-sm font-semibold text-[#243d58]">Credentials summary</span>
                      <input
                        value={form.credentialsSummary}
                        onChange={updateField("credentialsSummary")}
                        className="field-input"
                        placeholder="Registered caregiver with clinical eldercare experience"
                        required={isCaregiver}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Availability</span>
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
                    </fieldset>

                    <fieldset className="space-y-2 md:col-span-2">
                      <legend className="text-sm font-semibold text-[#243d58]">Languages you speak</legend>
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
                    </fieldset>

                    <fieldset className="space-y-2 md:col-span-2">
                      <legend className="text-sm font-semibold text-[#243d58]">
                        Services you want to provide
                      </legend>
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
                                className="mt-0.5 h-4 w-4 rounded border-[#b3c6d8] text-[#0f766e] focus:ring-[#0f766e]"
                              />
                              <span>{service}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>
                </section>

                <section className="rounded-xl border border-[#d8e3eb] bg-white/88 p-5">
                  <h2 className="text-lg font-bold text-[#132f4d]">Profile uploads</h2>
                  <div className="mt-4 space-y-4">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[#243d58]">Profile photo (public, required)</span>
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
                      <span className="text-sm font-semibold text-[#243d58]">License / supporting ID (private, optional)</span>
                      <input
                        ref={verificationDocInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) => setVerificationDoc(event.target.files?.[0] ?? null)}
                        className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                      />
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-[#5d6d81]">
                    Supporting ID is optional and kept private.
                  </p>
                </section>
              </>
            )}

            {!isCaregiver && (
              <section className="space-y-4 rounded-xl border border-[#d9e4ec] bg-[#f4f8fb] p-4 text-sm text-[#4f657f]">
                <p>Families can browse the directory and start in-app chat with caregivers.</p>
              </section>
            )}

            {isOtpStep && (
              <section className="space-y-3 rounded-xl border border-[#d8e3eb] bg-white/92 p-4 text-sm text-[#4f657f]">
                <p className="text-xs text-[#5e7187]">
                  Enter the SMS verification code sent to{" "}
                  <span className="font-semibold text-[#2a4763]">
                    {pendingOtpSignup?.phone}
                  </span>
                  .
                </p>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#243d58]">Verification code</span>
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    className="field-input"
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required={isOtpStep}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPendingOtpSignup(null);
                    setOtpCode("");
                    setSignupBanner(null);
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-[#1f6b93] underline-offset-2 hover:underline"
                >
                  Change account details
                </button>
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
                Upload a valid profile photo to complete your profile progress.
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
                {isSubmitting
                  ? isOtpStep
                    ? "Verifying code..."
                    : "Sending SMS code..."
                  : isOtpStep
                    ? "Verify code and create account"
                    : "Send SMS code"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
