"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CaregiverProfile,
  ChatMessage,
  ChatReport,
  ChatThread,
  ClientProfile,
  MarketplaceUser,
} from "@/lib/supabase/types";

type ThreadRow = Pick<
  ChatThread,
  | "id"
  | "client_user_id"
  | "caregiver_profile_id"
  | "last_message_at"
  | "last_message_preview"
  | "created_at"
  | "updated_at"
>;

type ThreadItem = ThreadRow & {
  peerName: string;
  peerSubtitle: string;
  peerAvatarUrl: string | null;
  peerUserId: string;
};

type CaregiverLookup = Pick<
  CaregiverProfile,
  "id" | "user_id" | "full_name" | "location" | "profile_photo_url" | "is_verified"
>;

type ClientLookup = Pick<ClientProfile, "user_id" | "full_name">;
type UserLookup = Pick<MarketplaceUser, "id" | "email">;
type AuthStateLookup = Pick<
  MarketplaceUser,
  "role" | "is_suspended" | "is_banned"
>;

function formatChatTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatThreadTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("en-SG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortThreads(rows: ThreadRow[]): ThreadRow[] {
  return [...rows].sort((a, b) => {
    const bTs = new Date(b.last_message_at ?? b.created_at).getTime();
    const aTs = new Date(a.last_message_at ?? a.created_at).getTime();
    return bTs - aTs;
  });
}

function sortThreadItems(items: ThreadItem[]): ThreadItem[] {
  return [...items].sort((a, b) => {
    const bTs = new Date(b.last_message_at ?? b.created_at).getTime();
    const aTs = new Date(a.last_message_at ?? a.created_at).getTime();
    return bTs - aTs;
  });
}

function getSafeNext(raw: string): string {
  const path = raw.trim();
  if (!path) return "/chats";
  if (!path.startsWith("/") || path.startsWith("//")) return "/chats";
  return path;
}

export default function ChatsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [caregiverTargetId, setCaregiverTargetId] = useState("");
  const [searchReady, setSearchReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountRole, setAccountRole] = useState<MarketplaceUser["role"] | null>(
    null
  );
  const [caregiverProfileId, setCaregiverProfileId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportReason, setReportReason] = useState<ChatReport["reason"]>("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCaregiverTargetId((params.get("caregiver") ?? "").trim());
    setSearchReady(true);
  }, []);

  async function ensureClientThread(
    clientUserId: string,
    requestedCaregiverProfileId: string
  ): Promise<string | null> {
    const { data: caregiver, error: caregiverError } = await supabase
      .from("profiles")
      .select("id, is_verified")
      .eq("id", requestedCaregiverProfileId)
      .eq("is_verified", true)
      .limit(1)
      .maybeSingle()
      .returns<Pick<CaregiverLookup, "id" | "is_verified"> | null>();

    if (caregiverError) {
      throw new Error(caregiverError.message);
    }

    if (!caregiver) {
      setNoticeMessage("This caregiver is no longer available for chat.");
      return null;
    }

    const { data: existingThread, error: existingThreadError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("client_user_id", clientUserId)
      .eq("caregiver_profile_id", caregiver.id)
      .limit(1)
      .maybeSingle();

    if (existingThreadError) {
      throw new Error(existingThreadError.message);
    }

    if (existingThread?.id) {
      return existingThread.id;
    }

    const { data: insertedThread, error: insertError } = await supabase
      .from("chat_threads")
      .insert({
        client_user_id: clientUserId,
        caregiver_profile_id: caregiver.id,
      })
      .select("id")
      .limit(1)
      .single();

    if (!insertError && insertedThread?.id) {
      return insertedThread.id;
    }

    if ((insertError as { code?: string } | null)?.code === "23505") {
      const { data: raceThread } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("client_user_id", clientUserId)
        .eq("caregiver_profile_id", caregiver.id)
        .limit(1)
        .maybeSingle();
      return raceThread?.id ?? null;
    }

    throw new Error(insertError?.message ?? "Unable to start chat thread.");
  }

  async function loadThreadsForContext(
    userId: string,
    role: MarketplaceUser["role"],
    ownCaregiverProfileId: string | null,
    preferredThreadId: string | null
  ) {
    let query = supabase
      .from("chat_threads")
      .select(
        "id, client_user_id, caregiver_profile_id, last_message_at, last_message_preview, created_at, updated_at"
      );

    if (role === "client") {
      query = query.eq("client_user_id", userId);
    } else if (role === "caregiver") {
      if (!ownCaregiverProfileId) {
        setThreads([]);
        setSelectedThreadId(null);
        return;
      }
      query = query.eq("caregiver_profile_id", ownCaregiverProfileId);
    } else {
      setThreads([]);
      setSelectedThreadId(null);
      return;
    }

    const { data: rows, error: rowsError } = await query.returns<ThreadRow[]>();
    if (rowsError) {
      throw new Error(rowsError.message);
    }

    const sortedRows = sortThreads(rows ?? []);
    let nextItems: ThreadItem[] = [];

    if (role === "client") {
      const caregiverIds = [...new Set(sortedRows.map((row) => row.caregiver_profile_id))];
      let caregiverMap = new Map<string, CaregiverLookup>();

      if (caregiverIds.length > 0) {
        const { data: caregivers, error: caregiversError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, location, profile_photo_url, is_verified")
          .in("id", caregiverIds)
          .returns<CaregiverLookup[]>();

        if (caregiversError) {
          throw new Error(caregiversError.message);
        }

        caregiverMap = new Map((caregivers ?? []).map((row) => [row.id, row]));
      }

      nextItems = sortedRows.map((row) => {
        const caregiver = caregiverMap.get(row.caregiver_profile_id);
        return {
          ...row,
          peerName: caregiver?.full_name ?? "Caregiver",
          peerSubtitle: caregiver?.location ?? "Location unavailable",
          peerAvatarUrl: caregiver?.profile_photo_url ?? null,
          peerUserId: caregiver?.user_id ?? "",
        };
      });
    } else {
      const clientIds = [...new Set(sortedRows.map((row) => row.client_user_id))];
      let clientNameMap = new Map<string, string>();
      let clientEmailMap = new Map<string, string>();

      if (clientIds.length > 0) {
        const [{ data: clientProfiles }, { data: users }] = await Promise.all([
          supabase
            .from("client_profiles")
            .select("user_id, full_name")
            .in("user_id", clientIds)
            .returns<ClientLookup[]>(),
          supabase.from("users").select("id, email").in("id", clientIds).returns<UserLookup[]>(),
        ]);

        clientNameMap = new Map(
          (clientProfiles ?? []).map((profile) => [profile.user_id, profile.full_name])
        );
        clientEmailMap = new Map((users ?? []).map((row) => [row.id, row.email]));
      }

      nextItems = sortedRows.map((row) => {
        const email = clientEmailMap.get(row.client_user_id) ?? "";
        const fallbackName = email ? email.split("@")[0] : "Client";
        return {
          ...row,
          peerName: clientNameMap.get(row.client_user_id) ?? fallbackName,
          peerSubtitle: email || "Email unavailable",
          peerAvatarUrl: null,
          peerUserId: row.client_user_id,
        };
      });
    }

    setThreads(nextItems);
    setSelectedThreadId((current) => {
      if (current && nextItems.some((thread) => thread.id === current)) return current;
      if (preferredThreadId && nextItems.some((thread) => thread.id === preferredThreadId)) {
        return preferredThreadId;
      }
      return nextItems[0]?.id ?? null;
    });
  }

  async function loadMessages(threadId: string) {
    setIsMessagesLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, thread_id, sender_user_id, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .returns<ChatMessage[]>();

    if (error) {
      setErrorMessage(error.message);
      setIsMessagesLoading(false);
      return;
    }

    setMessages(data ?? []);
    setIsMessagesLoading(false);
  }

  useEffect(() => {
    let active = true;
    if (!searchReady) return () => {};

    async function bootstrap() {
      setIsBootLoading(true);
      setErrorMessage(null);
      setNoticeMessage(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (active) {
          setErrorMessage(sessionError.message);
          setIsBootLoading(false);
        }
        return;
      }

      const user = sessionData.session?.user ?? null;
      if (!user) {
        const nextPath = getSafeNext(
          caregiverTargetId ? `/chats?caregiver=${caregiverTargetId}` : "/chats"
        );
        const params = new URLSearchParams({ next: nextPath });
        if (caregiverTargetId) {
          params.set("role", "client");
        }
        router.replace(`/login?${params.toString()}`);
        return;
      }

      if (!active) return;
      setAuthUser(user);

      const { data: appUser, error: appUserError } = await supabase
        .from("users")
        .select("role, is_suspended, is_banned")
        .eq("id", user.id)
        .limit(1)
        .maybeSingle()
        .returns<AuthStateLookup | null>();

      if (appUserError) {
        if (active) {
          setErrorMessage(appUserError.message);
          setIsBootLoading(false);
        }
        return;
      }

      if (appUser?.is_banned || appUser?.is_suspended) {
        await supabase.auth.signOut();
        if (active) {
          setErrorMessage(
            "Your account is currently restricted. Contact support if you believe this is a mistake."
          );
          setIsBootLoading(false);
        }
        return;
      }

      const role = (appUser?.role as MarketplaceUser["role"] | null) ?? "client";
      if (role === "admin") {
        if (active) {
          setErrorMessage("Admin accounts cannot use chat inbox.");
          setIsBootLoading(false);
        }
        return;
      }

      let ownCaregiverProfileId: string | null = null;
      if (role === "caregiver") {
        const { data: ownProfile, error: ownProfileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (ownProfileError) {
          if (active) {
            setErrorMessage(ownProfileError.message);
            setIsBootLoading(false);
          }
          return;
        }

        if (!ownProfile?.id) {
          if (active) {
            setErrorMessage(
              "Caregiver profile not found. Complete your profile first to access chats."
            );
            setIsBootLoading(false);
          }
          return;
        }

        ownCaregiverProfileId = ownProfile.id;
      }

      let preferredThreadId: string | null = null;
      if (role === "client" && caregiverTargetId) {
        try {
          preferredThreadId = await ensureClientThread(user.id, caregiverTargetId);
        } catch (error) {
          if (active) {
            const message =
              error instanceof Error ? error.message : "Unable to start chat thread.";
            setErrorMessage(message);
          }
        }
      }

      if (!active) return;
      setAccountRole(role);
      setCaregiverProfileId(ownCaregiverProfileId);

      try {
        await loadThreadsForContext(user.id, role, ownCaregiverProfileId, preferredThreadId);
      } catch (error) {
        if (active) {
          const message =
            error instanceof Error ? error.message : "Unable to load chat threads.";
          setErrorMessage(message);
        }
      } finally {
        if (active) setIsBootLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caregiverTargetId, searchReady]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    let active = true;
    void loadMessages(selectedThreadId);

    const channel = supabase
      .channel(`chat-messages-${selectedThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        (payload) => {
          if (!active) return;
          const nextMessage = payload.new as ChatMessage;
          setMessages((current) =>
            current.some((item) => item.id === nextMessage.id)
              ? current
              : [...current, nextMessage]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    setShowReportPanel(false);
    setReportReason("harassment");
    setReportDetails("");
    setReportSuccessMessage(null);
  }, [selectedThreadId]);

  useEffect(() => {
    if (!authUser || !accountRole) return;
    if (accountRole === "caregiver" && !caregiverProfileId) return;

    const threadFilter =
      accountRole === "client"
        ? `client_user_id=eq.${authUser.id}`
        : caregiverProfileId
          ? `caregiver_profile_id=eq.${caregiverProfileId}`
          : null;

    if (!threadFilter) return;

    const channel = supabase
      .channel(`chat-threads-${authUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter: threadFilter,
        },
        () => {
          void loadThreadsForContext(
            authUser.id,
            accountRole,
            caregiverProfileId,
            selectedThreadId
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, accountRole, caregiverProfileId, selectedThreadId]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedThreadId]);

  async function refreshThreads() {
    if (!authUser || !accountRole) return;

    try {
      await loadThreadsForContext(
        authUser.id,
        accountRole,
        caregiverProfileId,
        selectedThreadId
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh chat threads.";
      setErrorMessage(message);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authUser || !selectedThreadId) return;

    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: selectedThreadId,
        sender_user_id: authUser.id,
        body,
      })
      .select("id, thread_id, sender_user_id, body, created_at")
      .limit(1)
      .single()
      .returns<ChatMessage>();

    if (error) {
      setErrorMessage(error.message);
      setIsSending(false);
      return;
    }

    setMessages((current) =>
      current.some((item) => item.id === data.id) ? current : [...current, data]
    );
    setThreads((current) =>
      sortThreadItems(
        current.map((thread) =>
          thread.id === selectedThreadId
            ? {
                ...thread,
                last_message_at: data.created_at,
                last_message_preview: data.body,
              }
            : thread
        )
      )
    );
    setDraft("");

    if (accountRole === "caregiver" && caregiverProfileId) {
      void supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", caregiverProfileId)
        .eq("user_id", authUser.id);
    }

    setIsSending(false);
  }

  async function handleReportConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authUser || !selectedThread) return;
    if (!selectedThread.peerUserId) {
      setErrorMessage("Unable to identify this user for reporting.");
      return;
    }

    setIsReporting(true);
    setErrorMessage(null);
    setReportSuccessMessage(null);

    const trimmedDetails = reportDetails.trim();
    const { error } = await supabase.from("chat_reports").insert({
      thread_id: selectedThread.id,
      reporter_user_id: authUser.id,
      reported_user_id: selectedThread.peerUserId,
      reason: reportReason,
      details: trimmedDetails || null,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsReporting(false);
      return;
    }

    setReportSuccessMessage(
      "Report submitted. Our Trust & Safety team will review this ticket."
    );
    setShowReportPanel(false);
    setReportDetails("");
    setIsReporting(false);
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Realtime Chat</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              Silver Directory Chats
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              Exchange messages in real time with families and caregivers.
            </p>
          </div>
          <button onClick={() => void refreshThreads()} className="secondary-btn text-sm">
            Refresh
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {noticeMessage && (
        <div className="surface-panel mt-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {noticeMessage}
        </div>
      )}

      {isBootLoading ? (
        <div className="surface-panel mt-6 p-6 text-sm text-[#54677f]">
          Loading chats...
        </div>
      ) : (
        <section className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="surface-panel flex min-h-[220px] flex-col p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#435b78]">
              Conversations
            </h2>

            {threads.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[#d8e3eb] bg-white/85 p-4 text-sm text-[#596d84]">
                No chats yet. Start from the caregiver directory.
                <div className="mt-3">
                  <Link href="/directory" className="secondary-btn text-sm">
                    Open directory
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {threads.map((thread) => {
                  const isActive = thread.id === selectedThreadId;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? "border-[#89b6ce] bg-[#ecf5fb]"
                          : "border-[#d8e3eb] bg-white/85 hover:border-[#a9c6d8]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-[#133251]">{thread.peerName}</p>
                        <span className="text-[0.69rem] text-[#64778d]">
                          {formatThreadTime(thread.last_message_at ?? thread.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#5f7288]">{thread.peerSubtitle}</p>
                      <p className="mt-2 line-clamp-2 break-words text-xs text-[#4f637b]">
                        {thread.last_message_preview ?? "No messages yet"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="surface-panel flex min-h-[560px] flex-col overflow-hidden p-4 md:p-5">
            {selectedThread ? (
              <>
                <div className="border-b border-[#dbe6ee] pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#122f4d]">{selectedThread.peerName}</p>
                      <p className="text-xs text-[#60758d]">{selectedThread.peerSubtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReportPanel((current) => !current)}
                      className="secondary-btn border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                    >
                      {showReportPanel ? "Cancel report" : "Report"}
                    </button>
                  </div>

                  {showReportPanel && (
                    <form onSubmit={handleReportConversation} className="mt-3 space-y-2">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[#60758d]">
                          Reason
                        </span>
                        <select
                          value={reportReason}
                          onChange={(event) =>
                            setReportReason(event.target.value as ChatReport["reason"])
                          }
                          className="field-input text-sm"
                        >
                          <option value="harassment">Harassment</option>
                          <option value="scam">Scam</option>
                          <option value="agency_poaching">Agency poaching</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[#60758d]">
                          Details (optional)
                        </span>
                        <textarea
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          className="field-textarea min-h-[90px] text-sm"
                          placeholder="Share context for Trust & Safety review."
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={isReporting}
                        className="secondary-btn border-rose-300 bg-rose-50 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isReporting ? "Submitting..." : "Submit report"}
                      </button>
                    </form>
                  )}
                </div>

                {reportSuccessMessage && (
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {reportSuccessMessage}
                  </p>
                )}

                <div className="mt-4 max-h-[60vh] min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#dbe6ee] bg-white/75 p-3">
                  {isMessagesLoading ? (
                    <p className="text-sm text-[#62758d]">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-[#62758d]">
                      No messages yet. Send the first message below.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_user_id === authUser?.id;
                      return (
                        <article
                          key={message.id}
                          className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm shadow-[0_4px_10px_rgba(12,32,50,0.06)] ${
                            mine
                              ? "ml-auto bg-[#0f766e] text-white"
                              : "mr-auto border border-[#d8e3eb] bg-white text-[#243c58]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-6">
                            {message.body}
                          </p>
                          <p
                            className={`mt-1 text-[0.66rem] ${
                              mine ? "text-[#d8f7ef]" : "text-[#73869b]"
                            }`}
                          >
                            {formatChatTime(message.created_at)}
                          </p>
                        </article>
                      );
                    })
                  )}
                  <div ref={bottomAnchorRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Type your message..."
                    className="field-input"
                  />
                  <button
                    type="submit"
                    disabled={isSending || draft.trim().length === 0}
                    className="primary-btn min-w-[110px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#ccdbe8] bg-white/60 p-6 text-center text-sm text-[#5f7188]">
                Select a chat to start messaging.
              </div>
            )}
          </section>
        </section>
      )}
    </div>
  );
}
