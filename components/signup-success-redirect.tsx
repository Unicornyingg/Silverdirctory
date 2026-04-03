"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type SignupSuccessRedirectProps = {
  enabled: boolean;
  delayMs: number;
  path: string;
};

export default function SignupSuccessRedirect({
  enabled,
  delayMs,
  path,
}: SignupSuccessRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      router.replace(path);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, enabled, path, router]);

  return null;
}
