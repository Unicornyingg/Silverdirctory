import { NextResponse } from "next/server";
import { CARE_SERVICE_OPTIONS, isSupportedCareService } from "@/lib/care-services";
import {
  CAREGIVER_LANGUAGE_OPTIONS,
  isSupportedCaregiverLanguage,
} from "@/lib/caregiver-languages";

type ParsedCareRequest = {
  location: string;
  maxRate: number | null;
  service: string;
  availability: string;
  language: string;
  summary: string;
  missingQuestions: string[];
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

const CARE_REQUEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    location: {
      type: "string",
      description:
        "Singapore estate, town, or region mentioned by the family. Empty string if unknown.",
      maxLength: 80,
    },
    maxRate: {
      type: ["number", "null"],
      description:
        "Maximum hourly budget in SGD as a number. Use null if no budget is mentioned.",
      minimum: 1,
      maximum: 300,
    },
    service: {
      type: "string",
      enum: ["", ...CARE_SERVICE_OPTIONS],
      description:
        "Best single supported service filter. Empty string if no supported service maps clearly.",
    },
    availability: {
      type: "string",
      description:
        "Short availability or timing phrase, such as mornings, weekends, overnight, or short notice. Empty string if unknown.",
      maxLength: 80,
    },
    language: {
      type: "string",
      enum: ["", ...CAREGIVER_LANGUAGE_OPTIONS],
      description:
        "Preferred caregiver language if mentioned. Empty string if no language is mentioned.",
    },
    summary: {
      type: "string",
      description:
        "One sentence summary of the interpreted care request using plain family-friendly wording.",
      maxLength: 180,
    },
    missingQuestions: {
      type: "array",
      description:
        "Important follow-up questions the family should answer before contacting caregivers.",
      items: {
        type: "string",
        maxLength: 120,
      },
      maxItems: 3,
    },
  },
  required: [
    "location",
    "maxRate",
    "service",
    "availability",
    "language",
    "summary",
    "missingQuestions",
  ],
} as const;

function cleanShortText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getCanonicalLanguage(value: unknown): string {
  const raw = cleanShortText(value, 40);
  if (!raw || !isSupportedCaregiverLanguage(raw)) return "";
  return (
    CAREGIVER_LANGUAGE_OPTIONS.find(
      (language) => language.toLowerCase() === raw.toLowerCase()
    ) ?? ""
  );
}

function getMaxRate(value: unknown): string {
  if (typeof value !== "number") return "";
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value));
}

function sanitizeParsedCareRequest(value: ParsedCareRequest) {
  const service = cleanShortText(value.service, 180);
  const missingQuestions = Array.isArray(value.missingQuestions)
    ? value.missingQuestions
        .map((question) => cleanShortText(question, 120))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return {
    filters: {
      location: cleanShortText(value.location, 80),
      maxRate: getMaxRate(value.maxRate),
      service: isSupportedCareService(service) ? service : "",
      availability: cleanShortText(value.availability, 80),
      language: getCanonicalLanguage(value.language),
    },
    summary: cleanShortText(value.summary, 180),
    missingQuestions,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_CARE_HELPER_MODEL?.trim();

  if (!apiKey || !model) {
    return NextResponse.json(
      {
        error:
          "AI care helper is not configured. Add OPENAI_API_KEY and OPENAI_CARE_HELPER_MODEL to your environment.",
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const text =
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof body.text === "string"
      ? body.text.trim()
      : "";

  if (text.length < 12) {
    return NextResponse.json(
      { error: "Describe the care need in at least a short sentence." },
      { status: 400 }
    );
  }

  if (text.length > 1200) {
    return NextResponse.json(
      { error: "Care request is too long. Keep it under 1,200 characters." },
      { status: 400 }
    );
  }

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You convert messy family eldercare requests into Silver Directory search filters. Use only supported enum values. Do not invent services. Put unmapped needs into the summary or missingQuestions.",
          },
          {
            role: "user",
            content: `Care request: ${text}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "care_request_filters",
            strict: true,
            schema: CARE_REQUEST_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json(
      { error: "AI care helper provider request timed out or could not be reached." },
      { status: 502 }
    );
  }

  const responseJson = (await openAiResponse.json().catch(() => null)) as
    | OpenAiChatResponse
    | null;

  if (!openAiResponse.ok) {
    return NextResponse.json(
      {
        error:
          responseJson?.error?.message ??
          "AI care helper request failed. Check your OpenAI configuration.",
      },
      { status: 502 }
    );
  }

  const content = responseJson?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { error: "AI care helper returned an empty response." },
      { status: 502 }
    );
  }

  try {
    const parsed = JSON.parse(content) as ParsedCareRequest;
    return NextResponse.json(sanitizeParsedCareRequest(parsed));
  } catch {
    return NextResponse.json(
      { error: "AI care helper returned invalid structured data." },
      { status: 502 }
    );
  }
}
