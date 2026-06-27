"use client";

import Image from "next/image";
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SilviaCareAssistantProps = {
  initialAiLocation?: string;
  initialAiMaxRate?: string;
  initialAiService?: string;
  initialAiLanguage?: string;
  initialAiAvailability?: string;
  initialAiRequest?: string;
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
  "Hi, I am Silvia. How can I help you today? You can tell me what is going on, where care is needed, your budget, and any timing preferences.";
const SILVIA_MESSAGES_STORAGE_KEY = "silver-directory:silvia-messages";

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
  return `I am showing matches based on ${parts.join(", ")}.`;
}

function buildSilviaReply(result: AiCareRequestResponse): string {
  const questions = result.missingQuestions ?? [];
  const filters = result.filters ?? {};
  const details = [
    filters.location ? `around ${filters.location}` : "",
    filters.maxRate ? `within about S$${filters.maxRate}/hr` : "",
    filters.service ? `for ${filters.service.toLowerCase()}` : "",
    filters.availability ? `during ${filters.availability.toLowerCase()}` : "",
    filters.language ? `with ${filters.language} language support` : "",
  ].filter(Boolean);
  const intro =
    details.length > 0
      ? `Got it. I will look for caregivers ${details.join(", ")}.`
      : "Got it. I will look for caregivers who may fit what you shared.";

  if (questions.length === 0) {
    return `${intro} I have updated the matches below.`;
  }

  const followUp =
    questions.length === 1
      ? `One thing to confirm next: ${questions[0]}`
      : `A few things to confirm next: ${questions.join(" ")}`;

  return `${intro} I have updated the matches below. ${followUp}`;
}

function createMessage(sender: SilviaMessage["sender"], text: string): SilviaMessage {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sender,
    text,
  };
}

function isSilviaMessage(value: unknown): value is SilviaMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "sender" in value &&
    "text" in value &&
    typeof value.id === "string" &&
    (value.sender === "silvia" || value.sender === "family") &&
    typeof value.text === "string"
  );
}

function readSavedMessages(): SilviaMessage[] | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SILVIA_MESSAGES_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const messages = parsed.filter(isSilviaMessage).slice(-24);
    const hasFamilyMessage = messages.some((message) => message.sender === "family");
    if (!hasFamilyMessage) return null;
    return messages.length > 0 ? messages : null;
  } catch {
    return null;
  }
}

function saveMessages(messages: SilviaMessage[]) {
  window.localStorage.setItem(
    SILVIA_MESSAGES_STORAGE_KEY,
    JSON.stringify(messages.slice(-24))
  );
}

function shouldRouteToCareForum(text: string): boolean {
  const normalized = text.toLowerCase();
  const asksForAdvice =
    /\b(tip|tips|advice|guide|learn|article|forum|how do i|how to|what should i|safe way)\b/.test(
      normalized
    );
  const careTopic =
    /\b(transfer|transfers|fall|falls|bathing|toileting|feeding|dementia|mobility|wheelchair|walker|bed|chair|medication|exercise|companionship|respite)\b/.test(
      normalized
    );
  const caregiverSearch =
    /\b(caregiver|care giver|budget|\$|sgd|\/hr|per hour|tampines|bedok|pasir ris|morning|mornings|night|weekend|find|match|hire)\b/.test(
      normalized
    );

  return asksForAdvice && careTopic && !caregiverSearch;
}

function shouldRouteToDirectory(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(caregiver|care giver|budget|\$|sgd|\/hr|per hour|find|match|hire|need help|home care|eldercare|tampines|bedok|pasir ris|jurong|yishun|woodlands|hougang|morning|mornings|night|weekend)\b/.test(
    normalized
  );
}

function buildForumReply(text: string): string {
  const normalized = text.toLowerCase();
  if (/\btransfer|transfers|bed|chair|wheelchair\b/.test(normalized)) {
    return "Of course. I will bring you to the care forum for transfer tips. Look for guidance on moving slowly, clearing the path, locking wheels, and asking the elder to help only as much as they safely can.";
  }
  if (/\bfall|falls\b/.test(normalized)) {
    return "I will bring you to the care forum for fall-prevention tips. The big things to check are lighting, loose rugs, bathroom grip points, footwear, and whether walking support is needed.";
  }
  if (/\bdementia|memory\b/.test(normalized)) {
    return "I will bring you to the care forum for dementia-care tips. Gentle routines, short sentences, familiar objects, and calm redirection usually help more than correcting every mistake.";
  }

  return "I will bring you to the care forum. You can continue asking me about the care topic there.";
}

function buildInitialMessages({
  initialAiLocation,
  initialAiMaxRate,
  initialAiService,
  initialAiLanguage,
  initialAiAvailability,
  initialAiRequest,
}: Required<SilviaCareAssistantProps>): SilviaMessage[] {
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
}

export default function SilviaCareAssistant({
  initialAiLocation = "",
  initialAiMaxRate = "",
  initialAiService = "",
  initialAiLanguage = "",
  initialAiAvailability = "",
  initialAiRequest = "",
}: SilviaCareAssistantProps) {
  const router = useRouter();
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const bubbleDragMovedRef = useRef(false);
  const didCheckSavedMessagesRef = useRef(false);
  const [isOpen, setIsOpen] = useState(Boolean(initialAiRequest));
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [position, setPosition] = useState<BubblePosition | null>(null);
  const [messages, setMessages] = useState<SilviaMessage[]>(() =>
    buildInitialMessages({
      initialAiLocation,
      initialAiMaxRate,
      initialAiService,
      initialAiLanguage,
      initialAiAvailability,
      initialAiRequest,
    })
  );

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedMessages = readSavedMessages();
      didCheckSavedMessagesRef.current = true;
      if (!savedMessages) return;

      setMessages(savedMessages);
      setIsOpen(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!didCheckSavedMessagesRef.current) return;
    saveMessages(messages);
  }, [messages]);

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
    const familyMessage = createMessage("family", trimmed);
    setMessages((current) => {
      const nextMessages = [...current, familyMessage].slice(-24);
      saveMessages(nextMessages);
      return nextMessages;
    });

    if (shouldRouteToCareForum(trimmed)) {
      const forumReply = createMessage("silvia", buildForumReply(trimmed));
      setState("idle");
      setMessages((current) => {
        const nextMessages = [...current, forumReply].slice(-24);
        saveMessages(nextMessages);
        return nextMessages;
      });
      router.push(`/care-forum?silviaTopic=${encodeURIComponent(trimmed)}`);
      return;
    }

    if (!shouldRouteToDirectory(trimmed)) {
      const redirectReply = createMessage(
        "silvia",
        "I can help in two ways: tell me the kind of caregiver you need and I will find matches, or ask me for care tips and I will take you to the care forum."
      );
      setState("idle");
      setMessages((current) => {
        const nextMessages = [...current, redirectReply].slice(-24);
        saveMessages(nextMessages);
        return nextMessages;
      });
      return;
    }

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
      const errorReply = createMessage(
        "silvia",
        "I could not reach the care helper. Please try again."
      );
      setState("error");
      setMessages((current) => {
        const nextMessages = [...current, errorReply].slice(-24);
        saveMessages(nextMessages);
        return nextMessages;
      });
      return;
    }

    if (!response.ok) {
      const errorReply = createMessage(
        "silvia",
        result.error ?? "I could not understand that request yet. Please try again."
      );
      setState("error");
      setMessages((current) => {
        const nextMessages = [...current, errorReply].slice(-24);
        saveMessages(nextMessages);
        return nextMessages;
      });
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
    const directoryReply = createMessage("silvia", buildSilviaReply(result));
    setMessages((current) => {
      const nextMessages = [...current, directoryReply].slice(-24);
      saveMessages(nextMessages);
      return nextMessages;
    });
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
        className="fixed z-50 flex h-16 w-16 touch-none items-center justify-center overflow-hidden rounded-full border border-[#f3ff5a] bg-white p-1.5 shadow-[0_18px_42px_rgba(63,9,43,0.28)] transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3ff5a] focus-visible:ring-offset-2"
        style={
          position
            ? { left: position.left, top: position.top }
            : { bottom: "1.25rem", right: "1.25rem" }
        }
        aria-label="Open Silvia care assistant"
      >
        <Image
          src="/images/silvia-bot-logo.png"
          alt="Silvia chat assistant"
          width={58}
          height={52}
          className="h-full w-full object-contain"
        />
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
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1">
              <Image
                src="/images/silvia-bot-logo.png"
                alt=""
                width={32}
                height={29}
                className="h-full w-full object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#f3ff5a]">
                Silvia
              </p>
              <h2 className="truncate text-sm font-extrabold">Care concierge</h2>
            </div>
          </div>
        </div>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            setPosition(null);
            setIsOpen(false);
          }}
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
            className="field-textarea silvia-chat-textarea"
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
            onClick={() => {
              const resetMessages = [createMessage("silvia", DEFAULT_GREETING)];
              setMessages(resetMessages);
              window.localStorage.removeItem(SILVIA_MESSAGES_STORAGE_KEY);
              router.push("/directory");
            }}
            className="secondary-btn h-10 px-3 text-sm"
          >
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}
