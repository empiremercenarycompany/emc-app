/** Same-origin path only. `//host` and `/\host` are not paths. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  const text = next.trim();
  if (text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const url = new URL(text);
      const inner = url.searchParams.get("next");
      if (inner) return safeNextPath(inner);
      return safeNextPath(`${url.pathname}${url.search}`);
    } catch {
      return "/";
    }
  }
  if (!text.startsWith("/") || text.startsWith("//") || text.startsWith("/\\")) return "/";
  return text;
}

const CONFIRM_TYPES = ["email", "magiclink", "signup"] as const;
export type ConfirmOtpType = (typeof CONFIRM_TYPES)[number];

/** Only the email link types. Anything else is refused before verifyOtp. */
export function confirmOtpType(value: string | null | undefined): ConfirmOtpType | null {
  if (!value || !(CONFIRM_TYPES as readonly string[]).includes(value)) return null;
  return value as ConfirmOtpType;
}
