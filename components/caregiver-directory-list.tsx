"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProfileAvatar from "@/components/profile-avatar";
import { isLicensedNurseApproved } from "@/lib/caregiver-license-status";

type DirectoryListProfile = {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  location: string;
  bio: string;
  years_experience: number;
  credentials_summary: string;
  availability_summary: string;
  response_time_summary: string;
  minimum_shift_hours: number | null;
  last_active_at: string;
  hourly_rate: number;
  licensed_nurse_status:
    | "no_licence_uploaded"
    | "licence_submitted"
    | "pending_admin_review"
    | "licensed_nurse_approved"
    | "licence_rejected";
  hasActiveBoost: boolean;
  care_specialties: string[];
  languages_spoken: string[];
};

const currencyFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLastActive(value: string): string {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatExperienceLabel(yearsExperience: number): string {
  if (yearsExperience === 1) return "1 year";
  return `${yearsExperience} years`;
}

export default function CaregiverDirectoryList({
  profiles,
  viewerAuthenticated,
}: {
  profiles: DirectoryListProfile[];
  viewerAuthenticated: boolean;
}) {
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  const expandedProfile = useMemo(
    () => profiles.find((profile) => profile.id === expandedProfileId) ?? null,
    [expandedProfileId, profiles]
  );
  const expandedProfileTitleId = expandedProfile
    ? `caregiver-profile-title-${expandedProfile.id}`
    : undefined;

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpandedProfileId(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      <section className="stagger mt-6 space-y-4">
        {profiles.map((profile) => {
          const chatPath = `/chats?caregiver=${profile.id}`;
          const chatHref = viewerAuthenticated
            ? chatPath
            : `/login?role=client&next=${encodeURIComponent(chatPath)}`;
          const chatButtonLabel = viewerAuthenticated ? "Start chat" : "Sign in to start chat";
          const shortLanguages = profile.languages_spoken.slice(0, 3);
          const hiddenLanguageCount = Math.max(0, profile.languages_spoken.length - 3);
          const shortServices = profile.care_specialties.slice(0, 3);
          const hiddenServiceCount = Math.max(0, profile.care_specialties.length - 3);
          const hasLongBio = profile.bio.trim().length > 180;

          return (
            <article key={profile.id} className="surface-panel overflow-hidden p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-[120px_1fr_auto] md:items-start">
                <button
                  type="button"
                  onClick={() => setExpandedProfileId(profile.id)}
                  className="overflow-hidden rounded-2xl border border-[#d5e1ea] bg-[#ecf3f9] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
                  aria-label={`View profile photo for ${profile.full_name}`}
                >
                  <ProfileAvatar
                    src={profile.profile_photo_url}
                    alt={`${profile.full_name} profile`}
                    fallbackText={getInitials(profile.full_name) || "CG"}
                    className="h-[120px] w-[120px]"
                    imageClassName="object-top"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedProfileId(profile.id)}
                  className="order-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 md:order-none"
                  aria-label={`Open full profile details for ${profile.full_name}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold tracking-tight text-[#10233b]">
                      {profile.full_name}
                    </span>
                    {profile.hasActiveBoost && (
                      <span
                        title="This listing is a paid promotion."
                        className="rounded-full border border-[#f2cb8f] bg-[#fff4e3] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#6f3f0b]"
                      >
                        Boosted
                      </span>
                    )}
                    {isLicensedNurseApproved(profile.licensed_nurse_status) && (
                      <span
                        title="SNB nursing licence verified by Silver Directory admin."
                        className="rounded-full border border-[#c7d7fb] bg-[#edf2ff] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#2f3ea3]"
                      >
                        Licensed Nurse
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-[#58708c]">{profile.location}</p>
                  <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-[#59697e]">
                    {profile.bio}
                  </p>
                  {hasLongBio && (
                    <p className="mt-1 text-xs font-semibold text-[#4a617b]">
                      View full profile to read complete bio.
                    </p>
                  )}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#375474]">
                      Experience: {formatExperienceLabel(profile.years_experience ?? 0)}
                    </p>
                    <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#375474]">
                      Availability: {profile.availability_summary || "Not specified"}
                    </p>
                    <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#375474]">
                      Response time: {profile.response_time_summary || "Not specified"}
                    </p>
                    <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#375474]">
                      Min shift: {profile.minimum_shift_hours ? `${profile.minimum_shift_hours} hours` : "Not specified"}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-[#566b83]">
                    Credentials:{" "}
                    <span className="font-semibold text-[#294a69]">
                      {profile.credentials_summary || "Not specified"}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-[#5a6f86]">
                    Areas covered: {profile.location}
                  </p>
                  <p className="mt-1 text-xs text-[#7b8da1]">
                    Last active: {formatLastActive(profile.last_active_at)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {shortServices.length > 0 ? (
                      <>
                        {shortServices.map((service) => (
                          <span
                            key={service}
                            className="rounded-full border border-[#f0dcc2] bg-[#fff5e8] px-2.5 py-1 text-xs font-semibold text-[#845224]"
                          >
                            {service}
                          </span>
                        ))}
                        {hiddenServiceCount > 0 && (
                          <span className="rounded-full border border-[#f0dcc2] bg-[#fff5e8] px-2.5 py-1 text-xs font-semibold text-[#845224]">
                            +{hiddenServiceCount} more services
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full border border-[#f0dcc2] bg-[#fff5e8] px-2.5 py-1 text-xs font-semibold text-[#845224]">
                        Service details not listed
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {shortLanguages.length > 0 ? (
                      <>
                        {shortLanguages.map((language) => (
                          <span
                            key={language}
                            className="rounded-full border border-[#d6e6ef] bg-[#f2f8fc] px-2.5 py-1 text-xs font-semibold text-[#2f5470]"
                          >
                            {language}
                          </span>
                        ))}
                        {hiddenLanguageCount > 0 && (
                          <span className="rounded-full border border-[#d6e6ef] bg-[#f2f8fc] px-2.5 py-1 text-xs font-semibold text-[#4f647f]">
                            +{hiddenLanguageCount} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="rounded-full border border-[#d6e6ef] bg-[#f2f8fc] px-2.5 py-1 text-xs font-semibold text-[#4f647f]">
                        Language not specified
                      </span>
                    )}
                  </div>
                </button>

                <div className="order-2 col-span-full flex flex-col items-stretch gap-3 rounded-xl border border-[#dbe6ee] bg-white/80 p-3 md:order-none md:col-span-1 md:items-end md:border-0 md:bg-transparent md:p-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">
                      Hourly rate
                    </p>
                    <p className="text-2xl font-extrabold tracking-tight text-[#10233b]">
                      {currencyFormatter.format(profile.hourly_rate)}
                      <span className="ml-1 text-sm font-semibold text-[#4f627a]">/hr</span>
                    </p>
                  </div>
                  <Link
                    href={chatHref}
                    className="primary-btn w-full text-sm md:w-auto"
                  >
                    {chatButtonLabel}
                  </Link>
                  {!viewerAuthenticated && (
                    <p className="text-xs text-[#5d718a]">Family login required before messaging.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedProfileId(profile.id)}
                    className="secondary-btn w-full text-sm md:w-auto"
                  >
                    View full profile
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {expandedProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d2a]/65 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby={expandedProfileTitleId}
        >
          <div className="absolute inset-0" onClick={() => setExpandedProfileId(null)} aria-hidden="true" />

          <article className="surface-panel relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto p-5 md:p-7">
            <button
              type="button"
              onClick={() => setExpandedProfileId(null)}
              className="secondary-btn absolute right-4 top-4 h-9 w-9 px-0 text-lg leading-none"
              aria-label="Close profile view"
            >
              ×
            </button>

            <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-start md:gap-7">
              <div className="self-start overflow-hidden rounded-2xl border border-[#d5e1ea] bg-[#ecf3f9]">
                <ProfileAvatar
                  src={expandedProfile.profile_photo_url}
                  alt={`${expandedProfile.full_name} profile`}
                  fallbackText={getInitials(expandedProfile.full_name) || "CG"}
                  className="aspect-[4/5] w-full"
                  loading="eager"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 pr-12">
                  <h2 id={expandedProfileTitleId} className="text-3xl font-bold tracking-tight text-[#10233b]">
                    {expandedProfile.full_name}
                  </h2>
                  {isLicensedNurseApproved(expandedProfile.licensed_nurse_status) && (
                    <span className="rounded-full border border-[#c7d7fb] bg-[#edf2ff] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[#2f3ea3]">
                      Licensed Nurse
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-semibold text-[#58708c]">{expandedProfile.location}</p>
                <p className="mt-4 text-sm leading-7 text-[#4f647e]">{expandedProfile.bio}</p>

                <div className="mt-5 grid gap-2 rounded-xl border border-[#d8e3eb] bg-white/80 p-3 sm:grid-cols-2">
                  <p className="text-sm text-[#355372]">
                    <span className="font-semibold text-[#1d3b59]">Experience:</span>{" "}
                    {formatExperienceLabel(expandedProfile.years_experience ?? 0)}
                  </p>
                  <p className="text-sm text-[#355372]">
                    <span className="font-semibold text-[#1d3b59]">Availability:</span>{" "}
                    {expandedProfile.availability_summary || "Not specified"}
                  </p>
                  <p className="text-sm text-[#355372]">
                    <span className="font-semibold text-[#1d3b59]">Response time:</span>{" "}
                    {expandedProfile.response_time_summary || "Not specified"}
                  </p>
                  <p className="text-sm text-[#355372]">
                    <span className="font-semibold text-[#1d3b59]">Minimum shift:</span>{" "}
                    {expandedProfile.minimum_shift_hours
                      ? `${expandedProfile.minimum_shift_hours} hours`
                      : "Not specified"}
                  </p>
                  <p className="text-sm text-[#355372] sm:col-span-2">
                    <span className="font-semibold text-[#1d3b59]">Credentials:</span>{" "}
                    {expandedProfile.credentials_summary || "Not specified"}
                  </p>
                  <p className="text-sm text-[#355372] sm:col-span-2">
                    <span className="font-semibold text-[#1d3b59]">Areas covered:</span>{" "}
                    {expandedProfile.location}
                    <span className="ml-2 text-[#73869b]">
                      Last active: {formatLastActive(expandedProfile.last_active_at)}
                    </span>
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">
                    Services
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {expandedProfile.care_specialties.length > 0 ? (
                      expandedProfile.care_specialties.map((service) => (
                        <span
                          key={service}
                          className="rounded-full border border-[#f0dcc2] bg-[#fff5e8] px-2.5 py-1 text-xs font-semibold text-[#845224]"
                        >
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-[#f0dcc2] bg-[#fff5e8] px-2.5 py-1 text-xs font-semibold text-[#845224]">
                        Service details not listed
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">
                    Languages
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {expandedProfile.languages_spoken.length > 0 ? (
                      expandedProfile.languages_spoken.map((language) => (
                        <span
                          key={language}
                          className="rounded-full border border-[#d6e6ef] bg-[#f2f8fc] px-2.5 py-1 text-xs font-semibold text-[#2f5470]"
                        >
                          {language}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-[#d6e6ef] bg-[#f2f8fc] px-2.5 py-1 text-xs font-semibold text-[#4f647f]">
                        Language not specified
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-[#dbe6ee] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#60758d]">
                    Hourly rate
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-[#10233b]">
                    {currencyFormatter.format(expandedProfile.hourly_rate)}
                    <span className="ml-1 text-sm font-semibold text-[#4f627a]">/hr</span>
                  </p>
                  <div className="mt-4">
                    <Link
                      href={
                        viewerAuthenticated
                          ? `/chats?caregiver=${expandedProfile.id}`
                          : `/login?role=client&next=${encodeURIComponent(
                              `/chats?caregiver=${expandedProfile.id}`
                            )}`
                      }
                      className="primary-btn text-sm"
                    >
                      {viewerAuthenticated ? "Start chat" : "Sign in to start chat"}
                    </Link>
                    {!viewerAuthenticated && (
                      <p className="mt-2 text-xs text-[#5d718a]">
                        Sign in with your family account to start in-app chat.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
