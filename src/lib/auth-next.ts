/** Same-origin path only. `//host` and `/\host` are not paths. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

const CONFIRM_TYPES = ["email", "magiclink", "signup"] as const;
export type ConfirmOtpType = (typeof CONFIRM_TYPES)[number];

/** Only the email link types. Anything else is refused before verifyOtp. */
export function confirmOtpType(value: string | null | undefined): ConfirmOtpType | null {
  if (!value || !(CONFIRM_TYPES as readonly string[]).includes(value)) return null;
  return value as ConfirmOtpType;
}
