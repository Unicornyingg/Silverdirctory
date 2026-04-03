export const CAREGIVER_LANGUAGE_OPTIONS = [
  "English",
  "Mandarin",
  "Malay",
  "Tamil",
  "Hokkien",
  "Teochew",
  "Cantonese",
  "Hindi",
  "Bengali",
  "Tagalog",
  "Indonesian",
  "Burmese",
  "Thai",
  "Vietnamese",
] as const;

const LANGUAGE_LOOKUP = new Map<string, string>(
  CAREGIVER_LANGUAGE_OPTIONS.map((language) => [language.toLowerCase(), language])
);

export function sanitizeCaregiverLanguages(values: string[]): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const value of values) {
    const canonical = LANGUAGE_LOOKUP.get(value.trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    sanitized.push(canonical);
  }

  return sanitized;
}

export function isSupportedCaregiverLanguage(value: string): boolean {
  return LANGUAGE_LOOKUP.has(value.trim().toLowerCase());
}
