"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CARE_SERVICE_OPTIONS } from "@/lib/care-services";
import { CAREGIVER_LANGUAGE_OPTIONS } from "@/lib/caregiver-languages";

type DirectorySort =
  | "recommended"
  | "rate_low"
  | "experience_high"
  | "recently_active";

type DirectoryFiltersProps = {
  initialLocation: string;
  initialMaxRate: string;
  initialService: string;
  initialLanguage: string;
  initialSort: DirectorySort;
};

function getSortLabel(sort: DirectorySort): string {
  if (sort === "rate_low") return "Rate: low to high";
  if (sort === "experience_high") return "Experience: highest first";
  if (sort === "recently_active") return "Recently active";
  return "Recommended";
}

export default function DirectoryFilters({
  initialLocation,
  initialMaxRate,
  initialService,
  initialLanguage,
  initialSort,
}: DirectoryFiltersProps) {
  const router = useRouter();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [maxRate, setMaxRate] = useState(initialMaxRate);
  const [service, setService] = useState(initialService);
  const [language, setLanguage] = useState(initialLanguage);
  const [sort, setSort] = useState<DirectorySort>(initialSort);

  const activeTags = useMemo(() => {
    const tags: Array<{ key: string; label: string; remove: () => void }> = [];

    if (location.trim()) {
      tags.push({
        key: "location",
        label: `Location: ${location.trim()}`,
        remove: () => setLocation(""),
      });
    }

    if (maxRate.trim()) {
      tags.push({
        key: "maxRate",
        label: `Max rate: S$${maxRate.trim()}`,
        remove: () => setMaxRate(""),
      });
    }

    if (service) {
      tags.push({
        key: "service",
        label: `Service: ${service}`,
        remove: () => setService(""),
      });
    }

    if (language) {
      tags.push({
        key: "language",
        label: `Language: ${language}`,
        remove: () => setLanguage(""),
      });
    }

    if (sort !== "recommended") {
      tags.push({
        key: "sort",
        label: `Sort: ${getSortLabel(sort)}`,
        remove: () => setSort("recommended"),
      });
    }

    return tags;
  }, [language, location, maxRate, service, sort]);

  return (
    <form method="get" className="mt-5 space-y-4">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters((previous) => !previous)}
          className="secondary-btn w-full text-sm"
        >
          {showMobileFilters ? "Hide filters" : "Show filters"}
        </button>
      </div>

      <div className={`${showMobileFilters ? "block" : "hidden"} space-y-3 md:block`}>
        <details open className="rounded-xl border border-[#d8e3eb] bg-white/75 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#243d58]">
            Location and pricing
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Location (Estate)</span>
              <input
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="field-input"
                placeholder="Bedok, Tampines, Pasir Ris..."
              />
            </label>
            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Max rate (SGD)</span>
              <input
                name="maxRate"
                type="number"
                min={1}
                step={1}
                value={maxRate}
                onChange={(event) => setMaxRate(event.target.value)}
                className="field-input no-spinner"
                placeholder="40"
              />
            </label>
          </div>
        </details>

        <details open className="rounded-xl border border-[#d8e3eb] bg-white/75 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#243d58]">
            Language and sorting
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Service</span>
              <select
                name="service"
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="field-input"
              >
                <option value="">All services</option>
                {CARE_SERVICE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Language</span>
              <select
                name="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="field-input"
              >
                <option value="">All languages</option>
                {CAREGIVER_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Sort by</span>
              <select
                name="sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as DirectorySort)}
                className="field-input"
              >
                <option value="recommended">Recommended</option>
                <option value="rate_low">Rate: low to high</option>
                <option value="experience_high">Experience: highest first</option>
                <option value="recently_active">Recently active</option>
              </select>
            </label>
          </div>
        </details>
      </div>

      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={tag.remove}
              className="rounded-full border border-[#c8d9e6] bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#345472] transition hover:border-[#b7ccdc] hover:bg-[#f4f9fc]"
              aria-label={`Remove ${tag.label} filter`}
            >
              {tag.label} ×
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <button type="submit" className="primary-btn h-[2.9rem] w-full sm:min-w-[152px] sm:w-auto">
          Apply filters
        </button>
        <button
          type="button"
          onClick={() => router.push("/directory")}
          className="secondary-btn h-[2.9rem] w-full sm:min-w-[120px] sm:w-auto"
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
