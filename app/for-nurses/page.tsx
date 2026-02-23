"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  type JSX,
  useRef,
  useState,
} from "react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type NurseSignupForm = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  location: string;
  hourlyRate: string;
  bio: string;
};

const INITIAL_FORM: NurseSignupForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  location: "",
  hourlyRate: "",
  bio: "",
};

const MIN_BIO_LENGTH = 10;
const MAX_LICENSE_PHOTO_MB = 5;
const MAX_PROFILE_PHOTO_MB = 5;
const LICENSE_BUCKET = "nurse-license-photos";
const PROFILE_BUCKET = "nurse-profile-photos";

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
    return "Too many signup emails were sent recently. Wait and try again later, or configure custom SMTP in Supabase Auth settings to remove this bottleneck.";
  }

  if (lowered.includes("bucket not found")) {
    return "Upload bucket is missing. Re-run /supabase/schema.sql in Supabase SQL editor.";
  }

  if (lowered.includes("row-level security")) {
    return "Upload permissions are blocked. Re-run /supabase/schema.sql to apply Storage policies.";
  }

  if (lowered.includes("database error saving new user")) {
    return "Supabase auth user was created, but nurse profile save failed. Re-run /supabase/schema.sql in Supabase SQL editor.";
  }

  return error.message;
}

function getValidationMessage(
  form: NurseSignupForm,
  profilePhoto: File | null,
  licensePhoto: File | null
): string | null {
  const rate = Number(form.hourlyRate);

  if (form.fullName.trim().length < 2) return "Please enter your full name.";
  if (form.email.trim().length < 4) return "Please enter a valid email.";
  if (form.password.length < 8) return "Password must be at least 8 characters.";
  if (form.location.trim().length < 2) return "Please enter your service area.";
  if (form.bio.trim().length < MIN_BIO_LENGTH) {
    return `Professional bio must be at least ${MIN_BIO_LENGTH} characters.`;
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    return "Hourly rate must be greater than 0.";
  }

  if (!profilePhoto) {
    return "Please upload a profile photo.";
  }

  if (!profilePhoto.type.startsWith("image/")) {
    return "Profile photo must be an image (JPG, PNG, WEBP, etc.).";
  }

  if (profilePhoto.size > MAX_PROFILE_PHOTO_MB * 1024 * 1024) {
    return `Profile image must be ${MAX_PROFILE_PHOTO_MB}MB or smaller.`;
  }

  if (!licensePhoto) {
    return "Please upload a photo of your nursing license.";
  }

  if (!licensePhoto.type.startsWith("image/")) {
    return "License file must be an image (JPG, PNG, WEBP, etc.).";
  }

  if (licensePhoto.size > MAX_LICENSE_PHOTO_MB * 1024 * 1024) {
    return `License image must be ${MAX_LICENSE_PHOTO_MB}MB or smaller.`;
  }

  return null;
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "");
  return safeExtension || "jpg";
}

export default function NurseSignupPage(): JSX.Element {
  const [form, setForm] = useState<NurseSignupForm>(INITIAL_FORM);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const licensePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const updateField =
    (field: keyof NurseSignupForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };

  const updateProfilePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProfilePhoto(file);
  };

  const updateLicensePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLicensePhoto(file);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationMessage = getValidationMessage(form, profilePhoto, licensePhoto);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    if (!profilePhoto) {
      setErrorMessage("Please upload a profile photo.");
      return;
    }

    if (!licensePhoto) {
      setErrorMessage("Please upload a photo of your nursing license.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const profileExtension = getFileExtension(profilePhoto.name);
      const profilePath = `${Date.now()}-${crypto.randomUUID()}.${profileExtension}`;
      const { error: profileUploadError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(profilePath, profilePhoto, {
          upsert: false,
          contentType: profilePhoto.type,
          cacheControl: "3600",
        });

      if (profileUploadError) {
        setErrorMessage(getReadableSignupError(profileUploadError));
        return;
      }

      const { data: profileUrlData } = supabase.storage
        .from(PROFILE_BUCKET)
        .getPublicUrl(profilePath);

      const licenseExtension = getFileExtension(licensePhoto.name);
      const licensePath = `${Date.now()}-${crypto.randomUUID()}.${licenseExtension}`;
      const { error: licenseUploadError } = await supabase.storage
        .from(LICENSE_BUCKET)
        .upload(licensePath, licensePhoto, {
          upsert: false,
          contentType: licensePhoto.type,
          cacheControl: "3600",
        });

      if (licenseUploadError) {
        setErrorMessage(getReadableSignupError(licenseUploadError));
        return;
      }

      const { data: licenseUrlData } = supabase.storage
        .from(LICENSE_BUCKET)
        .getPublicUrl(licensePath);

      const { error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            phone: form.phone.trim() || null,
            location: form.location.trim(),
            hourly_rate: Number(form.hourlyRate),
            profile_photo_url: profileUrlData.publicUrl,
            license_photo_url: licenseUrlData.publicUrl,
            bio: form.bio.trim(),
            role: "Registered Nurse (RN)",
          },
        },
      });

      if (error) {
        setErrorMessage(getReadableSignupError(error));
        return;
      }

      setSuccessMessage(
        "Account created. Your profile and license photos were submitted for review. You will be listed after verification."
      );
      setForm(INITIAL_FORM);
      setProfilePhoto(null);
      setLicensePhoto(null);
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = "";
      }
      if (licensePhotoInputRef.current) {
        licensePhotoInputRef.current.value = "";
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        const parsed = getReadableSignupError(error as { message: string; code?: string });
        setErrorMessage(parsed);
      } else {
        setErrorMessage("Unable to create account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <main className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="surface-panel page-enter h-fit p-6">
          <p className="eyebrow">Nurse Application</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b]">
            Join the caregiver directory
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#54657b]">
            Upload your nursing license photo for manual verification. Approved
            profiles are published publicly for families.
          </p>

          <div className="stagger mt-6 space-y-3">
            {[
              "Submit your profile details, profile photo, and license photo.",
              "Admin reviews your identity and qualification manually.",
              "Approved profiles become visible in the public directory.",
            ].map((step) => (
              <div
                key={step}
                className="rounded-xl border border-[#d8e3eb] bg-white/85 p-3 text-sm leading-6 text-[#455870]"
              >
                {step}
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs leading-5 text-[#5d6d81]">
            Tip: use your real email inbox because verification and status
            updates are sent there.
          </p>
        </aside>

        <section className="surface-panel page-enter p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Full name
                </span>
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

              <label className="space-y-2">
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

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Phone (optional)
                </span>
                <input
                  value={form.phone}
                  onChange={updateField("phone")}
                  className="field-input"
                  placeholder="+1 555 100 2000"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Service area
                </span>
                <input
                  value={form.location}
                  onChange={updateField("location")}
                  className="field-input"
                  placeholder="Queens, NY"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#243d58]">
                  Hourly rate (USD)
                </span>
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={updateField("hourlyRate")}
                  className="field-input"
                  placeholder="45"
                  min={1}
                  step={1}
                  required
                />
              </label>

            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                Upload profile photo
              </span>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={updateProfilePhoto}
                className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                required
              />
              <p className="text-xs text-[#5d6d81]">
                This photo will appear on your public profile. Max {MAX_PROFILE_PHOTO_MB}MB.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                Upload nursing license photo
              </span>
              <input
                ref={licensePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={updateLicensePhoto}
                className="field-file file:mr-3 file:rounded-md file:border-0 file:bg-[#edf3f7] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#28435f] hover:file:bg-[#e2edf4]"
                required
              />
              <p className="text-xs text-[#5d6d81]">
                Private verification upload, max {MAX_LICENSE_PHOTO_MB}MB.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">
                Professional bio
              </span>
              <textarea
                value={form.bio}
                onChange={updateField("bio")}
                className="field-textarea"
                placeholder="Share your geriatric care experience, specialties, and availability."
                minLength={MIN_BIO_LENGTH}
                required
              />
            </label>

            <div className="space-y-1 text-xs leading-5 text-[#5d6d81]">
              <p>Professional bio minimum: {MIN_BIO_LENGTH} characters.</p>
              <p>Your profile stays hidden until manual verification.</p>
              <p>
                Avoid test domains like `example.com`; they are commonly blocked.
              </p>
            </div>

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? "Creating account..." : "Create nurse account"}
            </button>
          </form>
        </section>
      </main>

      <div className="mt-6 text-center text-sm text-[#56667b]">
        Looking for caregivers?{" "}
        <Link href="/directory" className="font-semibold text-[#1e6b92]">
          View caregiver directory
        </Link>
      </div>
    </div>
  );
}
