export type DiscordKind = "checkin" | "thursday" | "saturday";

export function formatCheckin(input: {
  name: string;
  squad: string;
  week: string;
  score: number;
}): string {
  return `${input.squad} · ${input.name} · week ${input.week} · Clearance mark ${input.score}/2`;
}

export function formatThursdayReminder(input: { week: string }): string {
  return `Thursday reminder · week ${input.week} · check-in closes Friday 11:59 PM Mountain time.`;
}

export function formatSaturdayTally(input: { squad: string; earned: number; possible: number }): string {
  return `Saturday tally · ${input.squad} · ${input.earned} of ${input.possible}`;
}

/**
 * Discord stays off until John configures a provider.
 * This never calls the network. There is no webhook in the repo.
 */
export function deliverDiscord(enabled: boolean): { sent: false; reason: "disabled" | "unconfigured" } {
  if (!enabled) return { sent: false, reason: "disabled" };
  return { sent: false, reason: "unconfigured" };
}
