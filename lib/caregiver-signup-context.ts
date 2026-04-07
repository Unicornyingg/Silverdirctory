export type CaregiverSignupContext = {
  fullName: string;
  email: string;
  phone: string;
  createdAt: number;
};

const STORAGE_KEY = "caregiver_signup_context_v1";
const MAX_CONTEXT_AGE_MS = 1000 * 60 * 30;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveCaregiverSignupContext(context: CaregiverSignupContext): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function readCaregiverSignupContext(): CaregiverSignupContext | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CaregiverSignupContext>;
    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      clearCaregiverSignupContext();
      return null;
    }

    if (Date.now() - parsed.createdAt > MAX_CONTEXT_AGE_MS) {
      clearCaregiverSignupContext();
      return null;
    }

    return {
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      createdAt: parsed.createdAt,
    };
  } catch {
    clearCaregiverSignupContext();
    return null;
  }
}

export function clearCaregiverSignupContext(): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
