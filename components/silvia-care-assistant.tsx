"use client";

import { FormEvent, PointerEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SilviaCareAssistantProps = {
  initialAiLocation: string;
  initialAiMaxRate: string;
  initialAiService: string;
  initialAiLanguage: string;
  initialAiAvailability: string;
  initialAiRequest: string;
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

type SilviaMessage = {
  id: string;
  sender: "silvia" | "family";
  text: string;
};

type BubblePosition = {
  left: number;
  top: number;
};

const DEFAULT_GREETING =
  "Hi, I am Silvia. How can I help you today? Tell me the care need, timing, location, budget, and any preferences.";

function buildActiveSearchText({
  initialAiLocation,
  initialAiMaxRate,
  initialAiService,
  initialAiLanguage,
  initialAiAvailability,
}: Omit<SilviaCareAssistantProps, "initialAiRequest">): string {
  const parts = [
    initialAiLocation ? `location ${initialAiLocation}` : "",
    initialAiMaxRate ? `budget S$${initialAiMaxRate}/hr` : "",
    initialAiService ? `service ${initialAiService}` : "",
    initialAiAvailability ? `timing ${initialAiAvailability}` : "",
    initialAiLanguage ? `language ${initialAiLanguage}` : "",
  ].filter(Boolean);

  if (parts.length === 0) return "";
  return `I am currently showing caregivers for ${parts.join(", ")}.`;
}

function buildSilviaReply(result: AiCareRequestResponse): string {
  const summary = result.summary ?? "I found the key details in your request.";
  const questions = result.missingQuestions ?? [];

  if (questions.length === 0) {
    return `${summary} I have updated the caregiver matches below.`;
  }

  return `${summary} I have updated the matches below. Before you message someone, also confirm: ${questions.join(" ")}`;
}

function createMessage(sender: SilviaMessage["sender"], text: string): SilviaMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender,
    text,
  };
}

export default function SilviaCareAssistant({
  initialAiLocation,
  initialAiMaxRate,
  initialAiService,
  initialAiLanguage,
  initialAiAvailability,
  initialAiRequest,
}: SilviaCareAssistantProps) {
  const router = useRouter();
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const bubbleDragMovedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(Boolean(initialAiRequest));
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [position, setPosition] = useState<BubblePosition | null>(null);
  const [messages, setMessages] = useState<SilviaMessage[]>(() => {
    const activeSearchText = buildActiveSearchText({
      initialAiLocation,
      initialAiMaxRate,
      initialAiService,
      initialAiLanguage,
      initialAiAvailability,
    });
    const initialMessages = [createMessage("silvia", DEFAULT_GREETING)];

    if (initialAiRequest) {
      initialMessages.push(createMessage("family", initialAiRequest));
    }
    if (activeSearchText) {
      initialMessages.push(createMessage("silvia", activeSearchText));
    }

    return initialMessages;
  });

  const activeCareContext = useMemo(
    () =>
      [
        initialAiRequest,
        initialAiLocation ? `Location: ${initialAiLocation}` : "",
        initialAiMaxRate ? `Budget: S$${initialAiMaxRate}/hr` : "",
        initialAiService ? `Service: ${initialAiService}` : "",
        initialAiAvailability ? `Timing: ${initialAiAvailability}` : "",
        initialAiLanguage ? `Language: ${initialAiLanguage}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [
      initialAiAvailability,
      initialAiLanguage,
      initialAiLocation,
      initialAiMaxRate,
      initialAiRequest,
      initialAiService,
    ]
  );

  function handleDragStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const panel = event.currentTarget.closest("[data-silvia-panel]");
    if (!(panel instanceof HTMLElement)) return;

    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const nextLeft = event.clientX - dragOffsetRef.current.x;
    const nextTop = event.clientY - dragOffsetRef.current.y;
    const maxLeft = Math.max(12, window.innerWidth - 380);
    const maxTop = Math.max(12, window.innerHeight - 520);

    setPosition({
      left: Math.min(Math.max(12, nextLeft), maxLeft),
      top: Math.min(Math.max(12, nextTop), maxTop),
    });
  }

  function handleDragEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleBubbleDragStart(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    bubbleDragMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleBubbleDragMove(event: PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const nextLeft = event.clientX - dragOffsetRef.current.x;
    const nextTop = event.clientY - dragOffsetRef.current.y;
    const maxLeft = Math.max(12, window.innerWidth - 76);
    const maxTop = Math.max(12, window.innerHeight - 76);

    bubbleDragMovedRef.current = true;
    setPosition({
      left: Math.min(Math.max(12, nextLeft), maxLeft),
      top: Math.min(Math.max(12, nextTop), maxTop),
    });
  }

  function handleBubbleDragEnd(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (trimmed.length < 12) {
      setState("error");
      setMessages((current) => [
        ...current,
        createMessage("silvia", "Tell me a little more so I can find useful matches."),
      ]);
      return;
    }

    const prompt = activeCareContext
      ? `${activeCareContext}\n\nLatest family message: ${trimmed}`
      : trimmed;

    setState("loading");
    setInput("");
    setMessages((current) => [...current, createMessage("family", trimmed)]);

    let response: Response;
    let result: AiCareRequestResponse;
    try {
      response = await fetch("/api/care-request/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: prompt }),
      });
      result = (await response.json()) as AiCareRequestResponse;
    } catch {
      setState("error");
      setMessages((current) => [
        ...current,
        createMessage("silvia", "I could not reach the care helper. Please try again."),
      ]);
      return;
    }

    if (!response.ok) {
      setState("error");
      setMessages((current) => [
        ...current,
        createMessage(
          "silvia",
          result.error ?? "I could not understand that request yet. Please try again."
        ),
      ]);
      return;
    }

    const nextParams = new URLSearchParams();
    const parsedFilters = result.filters ?? {};

    nextParams.set("aiRequest", trimmed);
    if (parsedFilters.location) nextParams.set("aiLocation", parsedFilters.location);
    if (parsedFilters.maxRate) nextParams.set("aiMaxRate", parsedFilters.maxRate);
    if (parsedFilters.service) nextParams.set("aiService", parsedFilters.service);
    if (parsedFilters.availability) {
      nextParams.set("aiAvailability", parsedFilters.availability);
    }
    if (parsedFilters.language) nextParams.set("aiLanguage", parsedFilters.language);

    setState("idle");
    setMessages((current) => [...current, createMessage("silvia", buildSilviaReply(result))]);
    router.push(`/directory?${nextParams.toString()}`);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          if (bubbleDragMovedRef.current) return;
          setPosition((current) => {
            if (!current) return current;
            return {
              left: Math.min(current.left, Math.max(12, window.innerWidth - 380)),
              top: Math.min(current.top, Math.max(12, window.innerHeight - 520)),
            };
          });
          setIsOpen(true);
        }}
        onPointerDown={handleBubbleDragStart}
        onPointerMove={handleBubbleDragMove}
        onPointerUp={handleBubbleDragEnd}
        onPointerCancel={handleBubbleDragEnd}
        className="fixed z-50 flex h-16 w-16 touch-none items-center justify-center rounded-full border border-[#f3ff5a] bg-[#5f0b43] text-lg font-extrabold text-[#f3ff5a] shadow-[0_18px_42px_rgba(63,9,43,0.28)] transition hover:bg-[#490631] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ff5a] focus-visible:ring-offset-2"
        style={
          position
            ? { left: position.left, top: position.top }
            : { bottom: "1.25rem", right: "1.25rem" }
        }
        aria-label="Open Silvia care assistant"
      >
        SV
      </button>
    );
  }

  return (
    <section
      data-silvia-panel
      className="fixed z-50 flex h-[min(520px,calc(100vh-2rem))] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-[#d7c1cc] bg-[#fffdf7] shadow-[0_22px_58px_rgba(63,9,43,0.24)]"
      style={
        position
          ? { left: position.left, top: position.top }
          : { bottom: "1.25rem", right: "1.25rem" }
      }
      aria-label="Silvia care assistant chat"
    >
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className="flex cursor-move touch-none items-center justify-between gap-3 bg-[#4a062f] px-4 py-3 text-white"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f3ff5a]">
            Silvia
          </p>
          <h2 className="truncate text-sm font-extrabold">Care concierge</h2>
        </div>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setIsOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-lg leading-none text-white transition hover:bg-white/10"
          aria-label="Collapse Silvia"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fffdf4] p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[86%] rounded-xl px-3 py-2 text-sm leading-6 ${
              message.sender === "family"
                ? "ml-auto bg-[#5f0b43] text-white"
                : "border border-[#eaded3] bg-white text-[#3f092b]"
            }`}
          >
            {message.text}
          </div>
        ))}
        {state === "loading" ? (
          <div className="max-w-[86%] rounded-xl border border-[#eaded3] bg-white px-3 py-2 text-sm font-semibold text-[#6f5d66]">
            Silvia is reading your care request...
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#eaded3] bg-white p-3">
        <label className="block">
          <span className="sr-only">Message Silvia</span>
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (state === "error") setState("idle");
            }}
            className="field-textarea min-h-[5.2rem] resize-none"
            placeholder="My mum needs morning help in Tampines, budget around $25/hr..."
            maxLength={1200}
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={state === "loading"}
            className="primary-btn h-10 flex-1 text-sm"
          >
            {state === "loading" ? "Searching..." : "Ask Silvia"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/directory")}
            className="secondary-btn h-10 px-3 text-sm"
          >
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}
