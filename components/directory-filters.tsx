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
  initialAvailability: string;
  initialSort: DirectorySort;
};

type AiCareRequestResponse = {
  filters?: {
    location?: string;
    maxRate?: string;
    service?: string;
    availability?: string;
    language?: string;
  };
  summary?: string;
  missingQuestions?: string[];
  error?: string;
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
  initialAvailability,
  initialSort,
}: DirectoryFiltersProps) {
  const router = useRouter();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [maxRate, setMaxRate] = useState(initialMaxRate);
  const [service, setService] = useState(initialService);
  const [language, setLanguage] = useState(initialLanguage);
  const [availability, setAvailability] = useState(initialAvailability);
  const [sort, setSort] = useState<DirectorySort>(initialSort);
  const [careRequestText, setCareRequestText] = useState("");
  const [aiState, setAiState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [aiMessage, setAiMessage] = useState("");
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);

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

    if (availability.trim()) {
      tags.push({
        key: "availability",
        label: `Availability: ${availability.trim()}`,
        remove: () => setAvailability(""),
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
  }, [availability, language, location, maxRate, service, sort]);

  async function handleParseCareRequest() {
    const trimmed = careRequestText.trim();
    if (trimmed.length < 12) {
      setAiState("error");
      setAiMessage("Describe the care need in at least a short sentence.");
      setAiQuestions([]);
      return;
    }

    setAiState("loading");
    setAiMessage("");
    setAiQuestions([]);

    let response: Response;
    let result: AiCareRequestResponse;
    try {
      response = await fetch("/api/care-request/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });
      result = (await response.json()) as AiCareRequestResponse;
    } catch {
      setAiState("error");
      setAiMessage("Unable to reach the AI care helper. Please try again.");
      setAiQuestions([]);
      return;
    }

    if (!response.ok) {
      setAiState("error");
      setAiMessage(result.error ?? "Unable to parse this care request.");
      setAiQuestions([]);
      return;
    }

    setLocation(result.filters?.location ?? "");
    setMaxRate(result.filters?.maxRate ?? "");
    setService(result.filters?.service ?? "");
    setAvailability(result.filters?.availability ?? "");
    setLanguage(result.filters?.language ?? "");
    setAiState("success");
    setAiMessage(result.summary ?? "Structured filters are ready to review.");
    setAiQuestions(result.missingQuestions ?? []);
  }

  return (
    <form method="get" className="mt-5 space-y-4">
      <section className="rounded-xl border border-[#d8e3eb] bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#10233b]">
              AI care request helper
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#55667b]">
              Paste a messy family request and turn it into directory filters.
            </p>
          </div>
          <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-bold text-[#345472]">
            Optional
          </span>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-semibold text-[#243d58]">Care request</span>
          <textarea
            value={careRequestText}
            onChange={(event) => setCareRequestText(event.target.value)}
            className="field-textarea min-h-[6.8rem]"
            placeholder="My dad needs help after surgery, mostly mornings, in Tampines. Budget around $25/hr."
            maxLength={1200}
          />
        </label>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void handleParseCareRequest()}
            disabled={aiState === "loading"}
            className="primary-btn h-[2.9rem] w-full sm:w-auto"
          >
            {aiState === "loading" ? "Reading request..." : "Generate filters"}
          </button>
          <p className="text-xs leading-5 text-[#5f7289]">
            The API key stays on the server and is never sent to the browser.
          </p>
        </div>

        {aiMessage ? (
          <div
            role={aiState === "error" ? "alert" : "status"}
            className={`mt-3 rounded-lg border px-3 py-2 text-sm leading-6 ${
              aiState === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {aiMessage}
            {aiQuestions.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {aiQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

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
          <div className="mt-3 grid gap-3 md:grid-cols-3">
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
            <label className="min-w-0 space-y-2">
              <span className="text-sm font-semibold text-[#243d58]">Availability</span>
              <input
                name="availability"
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                className="field-input"
                placeholder="Mornings, weekends, overnight..."
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
