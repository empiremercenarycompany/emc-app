import roster from "../../supabase/seed/roster.json";

/** Dev-only constant. Not a production secret. No mail is sent. */
export const DEV_LOGIN_PASSWORD = "emc-dev-login";

export type DevAccount = { label: string; email: string };

export function devRosterAccounts(): DevAccount[] {
  const characters = roster.characters.map((row) => ({ label: row.name, email: row.email }));
  const staff = roster.staff.map((row) => ({ label: row.label, email: row.email }));
  return [...characters, ...staff];
}

export function devLoginAllowed(flag: string | undefined, host: string | null | undefined): boolean {
  if (flag !== "1") return false;
  const name = (host ?? "").split(":")[0]?.replace(/^\[|\]$/g, "").trim().toLowerCase() ?? "";
  return name === "localhost" || name === "127.0.0.1";
}

export function devAccountEmail(labelOrEmail: string): string | null {
  const raw = labelOrEmail.trim().toLowerCase();
  const found = devRosterAccounts().find((row) => row.email.toLowerCase() === raw || row.label.toLowerCase() === raw);
  if (!found) return null;
  if (!found.email.endsWith("@example.test")) return null;
  return found.email;
}
