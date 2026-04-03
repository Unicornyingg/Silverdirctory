export type CareServiceCategory = "home_nursing" | "home_personal_care";

type CareServiceCategoryOption = {
  value: CareServiceCategory;
  label: string;
  description: string;
  rateLabel: string;
  rateSuffix: "/visit" | "/hr";
  services: readonly string[];
};

const HOME_PERSONAL_CARE_SERVICES = [
  "Mental Stimulation Activities",
  "Therapist-Prescribed Maintenance Exercises",
  "Elder-Sitting / Respite Care",
  "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
  "Feeding Assistance",
  "Dressing Assistance",
  "Toileting Assistance",
  "Washing / Bathing Assistance",
  "Walking or Moving Around Assistance",
  "Transfer Assistance (Bed to Chair and Vice Versa)",
  "Diaper Change Assistance",
] as const;

export const CARE_SERVICE_CATEGORY_OPTIONS: readonly CareServiceCategoryOption[] = [
  {
    value: "home_personal_care",
    label: "Home Personal Care",
    description: "Non-clinical care support delivered by the hour.",
    rateLabel: "Hourly rate (SGD)",
    rateSuffix: "/hr",
    services: HOME_PERSONAL_CARE_SERVICES,
  },
] as const;

const CATEGORY_LOOKUP = new Map<CareServiceCategory, CareServiceCategoryOption>(
  CARE_SERVICE_CATEGORY_OPTIONS.map((category) => [category.value, category])
);

const SERVICE_LOOKUP = new Set<string>(
  CARE_SERVICE_CATEGORY_OPTIONS.flatMap((category) => [...category.services])
);

const SERVICE_ALIASES = new Map<string, string>([
  [
    "Activities of Daily Living Support (Laundry, Light Housekeeping, Self-Care)",
    "Assist with Daily Living Activities (Laundry, Light Housekeeping, and Self-Care Activities)",
  ],
]);

export const CARE_SERVICE_OPTIONS = [...SERVICE_LOOKUP].sort((a, b) =>
  a.localeCompare(b)
);

export function isSupportedCareServiceCategory(
  value: string
): value is CareServiceCategory {
  return value === "home_personal_care";
}

export function getServicesForCategory(category: CareServiceCategory): readonly string[] {
  return CATEGORY_LOOKUP.get(category)?.services ?? [];
}

export function getServicesForCategories(
  categories: CareServiceCategory[]
): readonly string[] {
  if (categories.length === 0) return [];
  const merged = new Set<string>();
  for (const category of categories) {
    for (const service of getServicesForCategory(category)) {
      merged.add(service);
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

export function getRateLabelByCategory(category: CareServiceCategory): string {
  return CATEGORY_LOOKUP.get(category)?.rateLabel ?? "Rate (SGD)";
}

export function getRateSuffixByCategory(category: CareServiceCategory): "/visit" | "/hr" {
  return CATEGORY_LOOKUP.get(category)?.rateSuffix ?? "/hr";
}

export function sanitizeCareServiceCategories(values: string[]): CareServiceCategory[] {
  const seen = new Set<CareServiceCategory>();
  const sanitized: CareServiceCategory[] = [];

  for (const value of values) {
    if (!isSupportedCareServiceCategory(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    sanitized.push(value);
  }

  return sanitized;
}

export function sanitizeCareServices(
  values: string[],
  categories?: CareServiceCategory | CareServiceCategory[]
): string[] {
  const categoryList =
    typeof categories === "string"
      ? [categories]
      : Array.isArray(categories)
        ? categories
        : [];
  const categoryServices =
    categoryList.length > 0
      ? new Set(getServicesForCategories(categoryList))
      : null;
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = SERVICE_ALIASES.get(trimmed) ?? trimmed;
    if (!SERVICE_LOOKUP.has(normalized)) continue;
    if (categoryServices && !categoryServices.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    sanitized.push(normalized);
  }

  return sanitized;
}

export function isSupportedCareService(value: string): boolean {
  return SERVICE_LOOKUP.has(value);
}
