import Link from "next/link";
import CaregiverDirectoryList from "@/components/caregiver-directory-list";
import DirectoryFilters from "@/components/directory-filters";
import SiteHeader from "@/components/site-header";
import { isSupportedCaregiverLanguage } from "@/lib/caregiver-languages";
import { isSupportedCareService, isSupportedCareServiceCategory } from "@/lib/care-services";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CaregiverProfile } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type DirectorySort =
  | "recommended"
  | "rate_low"
  | "experience_high"
  | "recently_active";

type DirectoryProfile = Pick<
  CaregiverProfile,
  | "id"
  | "full_name"
  | "profile_photo_url"
  | "location"
  | "bio"
  | "years_experience"
  | "credentials_summary"
  | "availability_summary"
  | "response_time_summary"
  | "minimum_shift_hours"
  | "last_active_at"
  | "hourly_rate"
  | "service_category"
  | "service_categories"
  | "home_nursing_rate"
  | "home_personal_care_rate"
  | "is_verified"
  | "is_boosted"
  | "boost_expires_at"
  | "care_specialties"
  | "languages_spoken"
  | "created_at"
>;

type DirectoryCardProfile = DirectoryProfile & {
  hasActiveBoost: boolean;
};

function isSupportedDirectorySort(value: string): value is DirectorySort {
  return (
    value === "recommended" ||
    value === "rate_low" ||
    value === "experience_high" ||
    value === "recently_active"
  );
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]];
  }
  return arr;
}

function getComparableRate(
  profile: DirectoryProfile,
  categoryFilter: "" | "home_nursing" | "home_personal_care"
): number {
  if (categoryFilter === "home_nursing") {
    return profile.home_nursing_rate ?? profile.home_personal_care_rate ?? profile.hourly_rate;
  }

  if (categoryFilter === "home_personal_care") {
    return profile.home_personal_care_rate ?? profile.home_nursing_rate ?? profile.hourly_rate;
  }

  return Math.min(
    profile.home_personal_care_rate ?? Number.POSITIVE_INFINITY,
    profile.home_nursing_rate ?? Number.POSITIVE_INFINITY,
    profile.hourly_rate
  );
}

function sortProfilesForDirectory(
  profiles: DirectoryProfile[],
  sortBy: DirectorySort,
  categoryFilter: "" | "home_nursing" | "home_personal_care"
): DirectoryCardProfile[] {
  const now = Date.now();
  const boosted: DirectoryCardProfile[] = [];
  const regular: DirectoryCardProfile[] = [];

  for (const profile of profiles) {
    const boostedNow =
      profile.is_boosted &&
      !!profile.boost_expires_at &&
      new Date(profile.boost_expires_at).getTime() > now;
    const enriched = {
      ...profile,
      hasActiveBoost: boostedNow,
    };

    if (boostedNow) {
      boosted.push(enriched);
    } else {
      regular.push(enriched);
    }
  }

  const compare = (left: DirectoryCardProfile, right: DirectoryCardProfile): number => {
    if (sortBy === "rate_low") {
      return (
        getComparableRate(left, categoryFilter) - getComparableRate(right, categoryFilter)
      );
    }

    if (sortBy === "experience_high") {
      return (right.years_experience ?? 0) - (left.years_experience ?? 0);
    }

    if (sortBy === "recently_active") {
      return (
        new Date(right.last_active_at ?? right.created_at).getTime() -
        new Date(left.last_active_at ?? left.created_at).getTime()
      );
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  };

  const boostedOrdered =
    sortBy === "recommended" ? shuffle(boosted) : [...boosted].sort(compare);
  const regularOrdered = [...regular].sort(compare);

  return [...boostedOrdered, ...regularOrdered];
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locationFilter = getParam(params, "location").trim();
  const maxRateRaw = getParam(params, "maxRate").trim();
  const requestedCategory = getParam(params, "category").trim();
  const requestedService = getParam(params, "service").trim();
  const requestedLanguage = getParam(params, "language").trim();
  const requestedSort = getParam(params, "sort").trim();
  const categoryFilter = isSupportedCareServiceCategory(requestedCategory)
    ? requestedCategory
    : "";
  const serviceFilter = isSupportedCareService(requestedService)
    ? requestedService
    : "";
  const languageFilter = isSupportedCaregiverLanguage(requestedLanguage)
    ? requestedLanguage
    : "";
  const sortBy: DirectorySort = isSupportedDirectorySort(requestedSort)
    ? requestedSort
    : "recommended";
  const maxRate = Number(maxRateRaw);
  const hasValidMaxRate = Number.isFinite(maxRate) && maxRate > 0;

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <div className="surface-panel page-enter max-w-2xl p-6 text-[#874308]">
          <h1 className="text-2xl font-bold">Directory is not configured yet</h1>
          <p className="mt-3 text-sm leading-6">
            Add `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your environment, then reload the
            page.
          </p>
        </div>
      </div>
    );
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, profile_photo_url, location, bio, years_experience, credentials_summary, availability_summary, response_time_summary, minimum_shift_hours, last_active_at, hourly_rate, service_category, service_categories, home_nursing_rate, home_personal_care_rate, is_verified, is_boosted, boost_expires_at, care_specialties, languages_spoken, created_at"
    )
    .eq("is_verified", true)
    .order("created_at", { ascending: false });

  if (locationFilter) {
    query = query.filter("location", "ilike", `%${locationFilter}%`);
  }

  if (categoryFilter) {
    query = query.contains("service_categories", [categoryFilter]);
  }

  if (hasValidMaxRate) {
    if (categoryFilter === "home_nursing") {
      query = query.lte("home_nursing_rate", maxRate);
    } else if (categoryFilter === "home_personal_care") {
      query = query.lte("home_personal_care_rate", maxRate);
    } else {
      query = query.or(
        `home_nursing_rate.lte.${maxRate},home_personal_care_rate.lte.${maxRate}`
      );
    }
  }

  if (serviceFilter) {
    query = query.contains("care_specialties", [serviceFilter]);
  }

  if (languageFilter) {
    query = query.contains("languages_spoken", [languageFilter]);
  }

  const { data, error } = await query.returns<DirectoryProfile[]>();
  const orderedProfiles = sortProfilesForDirectory(data ?? [], sortBy, categoryFilter);
  const hasActiveFilters =
    !!locationFilter ||
    hasValidMaxRate ||
    !!categoryFilter ||
    !!serviceFilter ||
    !!languageFilter ||
    sortBy !== "recommended";

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Public Directory</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Silver Directory Caregivers
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#55667b]">
              Browse verified caregivers and start a direct chat. No platform
              commission on wages.
            </p>
          </div>
          <div className="rounded-xl border border-[#d8e3eb] bg-white/90 px-4 py-3 text-sm text-[#42556f]">
            {error ? "Unavailable" : `${orderedProfiles.length} profiles found`}
          </div>
        </div>

        <DirectoryFilters
          initialLocation={locationFilter}
          initialMaxRate={hasValidMaxRate ? maxRateRaw : ""}
          initialCategory={categoryFilter}
          initialService={serviceFilter}
          initialLanguage={languageFilter}
          initialSort={sortBy}
        />
      </section>

      <section className="surface-panel mt-6 p-5">
        <h2 className="text-base font-bold text-[#10243b]">Safety and trust reminders</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Not for emergencies: if there is immediate medical danger, call 995.
          </p>
          <p className="rounded-lg border border-[#d8e3eb] bg-white/85 px-3 py-2 text-sm text-[#4c617b]">
            First meeting: run a quick video call, confirm identity, and align care scope before
            first visit.
          </p>
        </div>
      </section>

      {error && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load profiles from Supabase: {error.message}
        </div>
      )}

      {!error && orderedProfiles.length === 0 && (
        <div className="surface-panel mt-6 p-6 text-[#4e6077]">
          <p className="text-sm font-semibold text-[#193652]">
            No verified caregiver profiles match your current filters.
          </p>
          <p className="mt-2 text-sm">
            Try increasing max rate, removing one filter, or switching service type.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {hasActiveFilters && (
              <Link href="/directory" className="secondary-btn text-sm">
                Clear all filters
              </Link>
            )}
            <Link href="/for-nurses" className="secondary-btn text-sm">
              Create caregiver account
            </Link>
          </div>
        </div>
      )}

      {!error && orderedProfiles.length > 0 && (
        <CaregiverDirectoryList profiles={orderedProfiles} />
      )}
    </div>
  );
}
