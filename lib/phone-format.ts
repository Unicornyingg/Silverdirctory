export function normalizePhoneForAuth(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 8) {
    return `+65${digitsOnly}`;
  }

  return cleaned;
}
