export const SERVICE_REGION_OPTIONS = [
  {
    value: "North",
    areas:
      "Kranji, Marsiling, Woodlands, Admiralty, Sembawang, Yishun, Khatib, Yio Chu Kang, Ang Mo Kio",
  },
  {
    value: "East",
    areas:
      "Pasir Ris, Tampines, Simei, Tanah Merah, Bedok, Kembangan, Eunos, Paya Lebar, Aljunied, Kallang, Geylang, Katong, Joo Chiat, Marine Parade, Siglap, Chai Chee, East Coast, Kaki Bukit, Ubi, Dakota",
  },
  {
    value: "West",
    areas:
      "Boon Lay, Jurong, Clementi, Dover, Buona Vista, Commonwealth, Queenstown, Redhill, Alexandra, Kent Ridge, Farrer Road, Holland, Ghim Moh",
  },
  {
    value: "South",
    areas:
      "Harbourfront, Telok Blangah, Pasir Panjang, Labrador Park, Mount Faber, West Coast, Sentosa Cove, Tiong Bahru, Bukit Merah",
  },
  {
    value: "North West",
    areas:
      "Bukit Batok, Bukit Gombak, Hillview, Bukit Panjang, Choa Chu Kang, Yew Tee, Cashew, Beauty World",
  },
  {
    value: "North East",
    areas:
      "Punggol, Sengkang, Buangkok, Hougang, Kovan, Potong Pasir, Woodleigh, Serangoon, Seletar",
  },
  {
    value: "Central",
    areas:
      "Bishan, Braddell, Toa Payoh, Balestier, Novena, Newton, Orchard, Chinatown, Stevens, Bendemeer, Bartley, MacPherson, Lorong Chuan, Tai Seng, Tanjong Rhu, Bugis, Lavender, Boon Keng, Farrer Park, Little India, Marymount, Jalan Besar, Caldecott, Botanic Gardens, Holland Village, River Valley, Marina Bay, City Hall, Raffles Place, Shenton Way, Outram, Clarke Quay",
  },
  {
    value: "No Preference",
    areas: "",
  },
] as const;

const SERVICE_REGION_SET = new Set<string>(
  SERVICE_REGION_OPTIONS.map((option) => option.value)
);

const SERVICE_REGION_MAP = new Map<string, string>(
  SERVICE_REGION_OPTIONS.map((option) => [option.value.toLowerCase(), option.value])
);

export function sanitizeServiceRegions(values: string[]): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const value of values) {
    const canonical = SERVICE_REGION_MAP.get(value.trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    sanitized.push(canonical);
  }

  const hasNoPreference = sanitized.includes("No Preference");
  if (hasNoPreference && sanitized.length > 1) {
    return ["No Preference"];
  }

  return sanitized;
}

export function formatServiceRegions(values: string[]): string {
  const normalized = sanitizeServiceRegions(values);
  if (normalized.length === 0) return "Not provided";
  return normalized.join(", ");
}

export function parseServiceRegionsFromLocation(location: string): string[] {
  const pieces = location
    .split(",")
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length === 0) return [];

  const mapped = pieces
    .map((piece) => SERVICE_REGION_MAP.get(piece.toLowerCase()) ?? piece)
    .filter((piece) => SERVICE_REGION_SET.has(piece));

  return sanitizeServiceRegions(mapped);
}
