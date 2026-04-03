"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type StartChatButtonProps = {
  caregiverId: string;
  caregiverName: string;
  buttonLabel?: string;
  containerClassName?: string;
  buttonClassName?: string;
};

function getChatPath(caregiverId: string): string {
  const params = new URLSearchParams({ caregiver: caregiverId });
  return `/chats?${params.toString()}`;
}

function getLoginPath(caregiverId: string): string {
  const params = new URLSearchParams({
    next: getChatPath(caregiverId),
    role: "client",
  });
  return `/login?${params.toString()}`;
}

export default function ContactCaregiverModal({
  caregiverId,
  caregiverName,
  buttonLabel,
  containerClassName,
  buttonClassName,
}: StartChatButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startChat() {
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.session?.user) {
        router.push(getLoginPath(caregiverId));
        return;
      }

      router.push(getChatPath(caregiverId));
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className={containerClassName ?? "mt-4 space-y-2"}>
      <button
        type="button"
        onClick={() => void startChat()}
        disabled={isStarting}
        className={`primary-btn w-full text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
          buttonClassName ?? ""
        }`}
      >
        {isStarting
          ? "Opening chat..."
          : buttonLabel ?? `Start chat with ${caregiverName.split(" ")[0] || caregiverName}`}
      </button>

      {errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
