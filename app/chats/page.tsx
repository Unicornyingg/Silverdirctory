"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CaregiverProfile,
  ChatMessage,
  ChatThread,
  MarketplaceUser,
} from "@/lib/supabase/types";

type ChatRole = "client" | "caregiver";

type ThreadRecord = Pick<
  ChatThread,
  | "id"
  | "client_user_id"
  | "caregiver_profile_id"
  | "last_message_at"
  | "last_message_preview"
  | "created_at"
  | "updated_at"
>;

type CaregiverLookup = Pick<
  CaregiverProfile,
  "id" | "full_name" | "location" | "profile_photo_url"
>;

type UserLookup = Pick<MarketplaceUser, "id" | "email">;

type ThreadListItem = ThreadRecord & {
  participantName: string;
  participantSubtitle: string;
  participantAvatarUrl: string | null;
  participantInitials: string;
};

const MAX_MESSAGE_LENGTH = 1500;

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getThreadTimestamp(thread: ThreadRecord): number {
  return new Date(thread.last_message_at ?? thread.created_at).getTime();
}

function sortThreadsByActivity<T extends ThreadRecord>(threads: T[]): T[] {
  return [...threads].sort(
    (left, right) => getThreadTimestamp(right) - getThreadTimestamp(left)
  );
}

function getInitials(value: string): string {
  const parts = value
    .split(/[^\w]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "SD";
}

function formatThreadTime(value: string | null, fallback: string): string {
  const target = value ?? fallback;
  const date = new Date(target);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString("en-SG", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-SG", {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(value: string): string {
  return new Date(value).toLocaleString("en-SG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fallbackNameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  return localPart ? `Client (${localPart})` : "Client";
}

async function loadThreadItems(params: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  role: ChatRole;
  userId: string;
  caregiverProfileId: string | null;
}): Promise<ThreadListItem[]> {
  const { supabase, role, userId, caregiverProfileId } = params;

  let query = supabase
    .from("chat_threads")
    .select(
      "id, client_user_id, caregiver_profile_id, last_message_at, last_message_preview, created_at, updated_at"
    );

  if (role === "client") {
    query = query.eq("client_user_id", userId);
  } else {
    if (!caregiverProfileId) return [];
    query = query.eq("caregiver_profile_id", caregiverProfileId);
  }

  const { data: rows, error } = await query
    .order("updated_at", { ascending: false })
    .returns<ThreadRecord[]>();

  if (error) {
    throw new Error(error.message);
  }

  const threads = rows ?? [];
  if (threads.length === 0) return [];

  if (role === "client") {
    const caregiverIds = [...new Set(threads.map((thread) => thread.caregiver_profile_id))];
    const { data: caregivers, error: caregiverError } = await supabase
      .from("profiles")
      .select("id, full_name, location, profile_photo_url")
      .in("id", caregiverIds)
      .returns<CaregiverLookup[]>();

    if (caregiverError) {
      throw new Error(caregiverError.message);
    }

    const caregiverMap = new Map((caregivers ?? []).map((row) => [row.id, row]));

    return sortThreadsByActivity(
      threads.map((thread) => {
        const caregiver = caregiverMap.get(thread.caregiver_profile_id);
        const participantName = caregiver?.full_name ?? "Caregiver";

        return {
          ...thread,
          participantName,
          participantSubtitle: caregiver?.location ?? "Caregiver account",
          participantAvatarUrl: caregiver?.profile_photo_url ?? null,
          participantInitials: getInitials(participantName),
        };
      })
    );
  }

  const clientUserIds = [...new Set(threads.map((thread) => thread.client_user_id))];
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email")
    .in("id", clientUserIds)
    .returns<UserLookup[]>();

  if (usersError) {
    throw new Error(usersError.message);
  }

  const userMap = new Map((users ?? []).map((row) => [row.id, row]));

  return sortThreadsByActivity(
    threads.map((thread) => {
      const participant = userMap.get(thread.client_user_id);
      const participantName = fallbackNameFromEmail(
        participant?.email ?? "client@account"
      );

      return {
        ...thread,
        participantName,
        participantSubtitle: participant?.email ?? "Family account",
        participantAvatarUrl: null,
        participantInitials: getInitials(participantName),
      };
    })
  );
}

async function ensureClientThread(params: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  clientUserId: string;
  caregiverProfileId: string;
}): Promise<string> {
  const { supabase, clientUserId, caregiverProfileId } = params;

  const { data: existingThread, error: existingThreadError } = await supabase
    .from("chat_threads")
    .select(
      "id, client_user_id, caregiver_profile_id, last_message_at, last_message_preview, created_at, updated_at"
    )
    .eq("client_user_id", clientUserId)
    .eq("caregiver_profile_id", caregiverProfileId)
    .limit(1)
    .maybeSingle()
    .returns<ThreadRecord | null>();

  if (existingThreadError) {
    throw new Error(existingThreadError.message);
  }

  if (existingThread) {
    return existingThread.id;
  }

  const { data: insertedThread, error: insertError } = await supabase
    .from("chat_threads")
    .insert({
      client_user_id: clientUserId,
      caregiver_profile_id: caregiverProfileId,
    })
    .select("id")
    .single();

  if (!insertError && insertedThread?.id) {
    return insertedThread.id;
  }

  if (insertError && insertError.code === "23505") {
    const { data: retryThread, error: retryError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("client_user_id", clientUserId)
      .eq("caregiver_profile_id", caregiverProfileId)
      .limit(1)
      .maybeSingle();

    if (retryError) {
      throw new Error(retryError.message);
    }
    if (retryThread?.id) {
      return retryThread.id;
    }
  }

  throw new Error(insertError?.message ?? "Unable to open a chat thread.");
}

export default function ChatsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [role, setRole] = useState<ChatRole | null>(null);
  const [caregiverProfileId, setCaregiverProfileId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  const refreshThreads = useCallback(async () => {
    if (!authUser || !role) return;
    try {
      const nextThreads = await loadThreadItems({
        supabase,
        role,
        userId: authUser.id,
        caregiverProfileId,
      });
      setThreads(nextThreads);
      setSelectedThreadId((previous) => {
        if (!previous) return nextThreads[0]?.id ?? null;
        return nextThreads.some((thread) => thread.id === previous)
          ? previous
          : (nextThreads[0]?.id ?? null);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh chat inbox.";
      setErrorMessage(message);
    }
  }, [authUser, caregiverProfileId, role, supabase]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsBootLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);

      const params = new URLSearchParams(searchKey);
      const requestedThreadId = params.get("thread");
      const requestedCaregiverId = params.get("caregiver");
      const nextPath = `${pathname}${searchKey ? `?${searchKey}` : ""}`;

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (active) {
          setErrorMessage(sessionError.message);
          setIsBootLoading(false);
        }
        return;
      }

      const sessionUser = sessionData.session?.user ?? null;
      if (!sessionUser) {
        const loginParams = new URLSearchParams({ next: nextPath });
        if (requestedCaregiverId) {
          loginParams.set("role", "client");
        }
        router.replace(`/login?${loginParams.toString()}`);
        return;
      }

      if (!active) return;
      setAuthUser(sessionUser);

      const { data: appUser, error: appUserError } = await supabase
        .from("users")
        .select("id, role, is_suspended, is_banned")
        .eq("id", sessionUser.id)
        .limit(1)
        .maybeSingle();

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

      const accountRole = appUser?.role;
      if (accountRole !== "client" && accountRole !== "caregiver") {
        if (active) {
          setErrorMessage("Only caregiver and family accounts can access chat.");
          setIsBootLoading(false);
        }
        return;
      }

      let currentCaregiverProfileId: string | null = null;
      if (accountRole === "caregiver") {
        const { data: caregiverProfileRow, error: caregiverProfileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", sessionUser.id)
          .limit(1)
          .maybeSingle();

        if (caregiverProfileError) {
          if (active) {
            setErrorMessage(caregiverProfileError.message);
            setIsBootLoading(false);
          }
          return;
        }

        currentCaregiverProfileId = caregiverProfileRow?.id ?? null;
        if (!currentCaregiverProfileId && active) {
          setInfoMessage(
            "Create your caregiver profile first. Your inbox appears once families start a chat."
          );
        }
      }

      let ensuredThreadId: string | null = null;
      if (
        accountRole === "client" &&
        requestedCaregiverId &&
        isLikelyUuid(requestedCaregiverId)
      ) {
        try {
          ensuredThreadId = await ensureClientThread({
            supabase,
            clientUserId: sessionUser.id,
            caregiverProfileId: requestedCaregiverId,
          });
        } catch (error) {
          if (active) {
            const message =
              error instanceof Error
                ? error.message
                : "Unable to start chat with this caregiver.";
            setErrorMessage(message);
          }
        }
      }

      const nextThreads = await loadThreadItems({
        supabase,
        role: accountRole,
        userId: sessionUser.id,
        caregiverProfileId: currentCaregiverProfileId,
      });

      if (!active) return;
      setRole(accountRole);
      setCaregiverProfileId(currentCaregiverProfileId);
      setThreads(nextThreads);

      const preferredThreadId =
        (requestedThreadId &&
        nextThreads.some((thread) => thread.id === requestedThreadId)
          ? requestedThreadId
          : null) ??
        (ensuredThreadId &&
        nextThreads.some((thread) => thread.id === ensuredThreadId)
          ? ensuredThreadId
          : null) ??
        nextThreads[0]?.id ??
        null;

      setSelectedThreadId(preferredThreadId);
      if (preferredThreadId && preferredThreadId !== requestedThreadId) {
        router.replace(`/chats?thread=${preferredThreadId}`);
      }
      setIsBootLoading(false);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [pathname, router, searchKey, supabase]);

  useEffect(() => {
    if (!selectedThreadId) return;

    let active = true;

    async function loadMessages() {
      setIsMessagesLoading(true);
      const { data: messageRows, error: messageError } = await supabase
        .from("chat_messages")
        .select("id, thread_id, sender_user_id, body, created_at")
        .eq("thread_id", selectedThreadId)
        .order("created_at", { ascending: true })
        .returns<ChatMessage[]>();

      if (!active) return;

      if (messageError) {
        setErrorMessage(messageError.message);
        setIsMessagesLoading(false);
        return;
      }

      setMessages(messageRows ?? []);
      setIsMessagesLoading(false);
    }

    void loadMessages();

    return () => {
      active = false;
    };
  }, [selectedThreadId, supabase]);

  useEffect(() => {
    if (!selectedThreadId) return;

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
          const incoming = payload.new as ChatMessage;
          setMessages((previous) => {
            if (previous.some((message) => message.id === incoming.id)) {
              return previous;
            }
            return [...previous, incoming];
          });

          setThreads((previous) =>
            sortThreadsByActivity(
              previous.map((thread) =>
                thread.id === incoming.thread_id
                  ? {
                      ...thread,
                      last_message_at: incoming.created_at,
                      last_message_preview: incoming.body.slice(0, 160),
                    }
                  : thread
              )
            )
          );
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [selectedThreadId, supabase]);

  useEffect(() => {
    if (!authUser || !role) return;

    const filter =
      role === "client"
        ? `client_user_id=eq.${authUser.id}`
        : caregiverProfileId
          ? `caregiver_profile_id=eq.${caregiverProfileId}`
          : null;

    if (!filter) return;

    const channel = supabase
      .channel(`chat-threads-${role}-${filter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
          filter,
        },
        () => {
          void refreshThreads();
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [authUser, caregiverProfileId, refreshThreads, role, supabase]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!selectedThreadId || !authUser) {
      setErrorMessage("Select a conversation before sending a message.");
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    setIsSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      thread_id: selectedThreadId,
      sender_user_id: authUser.id,
      body: trimmed,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSending(false);
      return;
    }

    setDraft("");
    setIsSending(false);
  }

  function handleSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setErrorMessage(null);
    setInfoMessage(null);
    router.replace(`/chats?thread=${threadId}`);
  }

  if (isBootLoading) {
    return (
      <div className="site-shell">
        <SiteHeader />
        <section className="surface-panel page-enter p-6 text-sm text-[#54677f]">
          Loading your chat inbox...
        </section>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader />

      <section className="surface-panel page-enter p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Inbox</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#10233b] md:text-4xl">
              In-app chat
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#56677c]">
              Keep early conversations inside Silver Directory before sharing personal contact
              details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshThreads()}
            className="secondary-btn text-sm"
          >
            Refresh inbox
          </button>
        </div>
      </section>

      {errorMessage && (
        <section className="surface-panel mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </section>
      )}

      {infoMessage && (
        <section className="surface-panel mt-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {infoMessage}
        </section>
      )}

      <main className="mt-6 grid gap-4 lg:grid-cols-[330px_1fr]">
        <aside className="surface-panel overflow-hidden p-3">
          {threads.length === 0 ? (
            <div className="rounded-lg border border-[#d8e3eb] bg-white/85 p-4 text-sm text-[#4f627a]">
              {role === "client"
                ? "No conversations yet. Open a caregiver profile and select Start chat."
                : "No family conversations yet. New chats from families will appear here."}
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => {
                const isActive = thread.id === selectedThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[#9fd2cb] bg-[#e9f6f3]"
                        : "border-[#d8e3eb] bg-white/90 hover:border-[#b7cedf]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#173555]">
                        {thread.participantName}
                      </p>
                      <p className="text-xs text-[#5c7088]">
                        {formatThreadTime(thread.last_message_at, thread.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#5f7390]">{thread.participantSubtitle}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-[#4f637d]">
                      {thread.last_message_preview?.trim() || "No messages yet."}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="surface-panel flex min-h-[420px] flex-col overflow-hidden">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[#556980]">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <header className="border-b border-[#d8e3eb] px-5 py-4">
                <p className="text-base font-bold text-[#132f4d]">
                  {selectedThread.participantName}
                </p>
                <p className="mt-1 text-xs text-[#5c7088]">
                  {selectedThread.participantSubtitle}
                </p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7fafc] px-4 py-4">
                {isMessagesLoading ? (
                  <p className="text-sm text-[#5d718a]">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#5d718a]">
                    No messages yet. Start with a short introduction and care requirements.
                  </p>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_user_id === authUser?.id;
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                          isOwn
                            ? "ml-auto border-[#96ccc4] bg-[#dff3ef] text-[#0f2f2c]"
                            : "border-[#d5e1ea] bg-white text-[#203a55]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                        <p className="mt-1 text-[0.68rem] text-[#5f728a]">
                          {formatMessageTime(message.created_at)}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="border-t border-[#d8e3eb] bg-white/95 px-4 py-3"
              >
                <label className="sr-only" htmlFor="chat-message-input">
                  Message
                </label>
                <textarea
                  id="chat-message-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="field-textarea min-h-[110px] resize-y"
                  placeholder="Type your message..."
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#61758f]">
                    Keep communication respectful. Report suspicious behavior to admin support.
                  </p>
                  <button
                    type="submit"
                    disabled={isSending || draft.trim().length === 0}
                    className="primary-btn min-w-[160px] text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>

      <section className="surface-panel mt-6 p-4 text-sm text-[#556980]">
        Need a caregiver first?{" "}
        <Link href="/directory" className="font-semibold text-[#1f6b93]">
          Browse directory
        </Link>
      </section>
    </div>
  );
}
