/** 14 days. The Shieldmate window stays 14 days. */
export const SHIELDMATE_WINDOW_DAYS = 14;

export const SHIELDMATE_INVITE =
  "Bring your Shieldmate. Share your invite from the EMC app. If your friend joins within 14 days, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.";

export const SHIELDMATE_FORWARD =
  "I just joined the Empire Mercenary Company. Open my Shieldmate invite in the EMC app within 14 days and we'll each get $20 off our first two months: https://emc.thegiantdungeonmaster.com/shieldmate";

export const SHIELDMATE_REVEAL =
  "Shieldmates. Join with a friend and you each get $20 off your first two months, and you'll be in the same squad. Pick one thing you two grew up doing together, like a game, an instrument, a trade or a language, and you both start proficient in it. Share your invite. Your friend has 14 days to join.";

export const SHIELDMATE_ASK = "Signing up with a friend? Get the Shieldmate bonus";

export function shieldmateDaysLeft(expiresAt: string, now = Date.now()): number {
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

export function shieldmateCountdown(daysLeft: number, status: string): string {
  if (status === "paired") return "Your Shieldmate joined. You each get $20 off your first two months.";
  if (status === "expired" || daysLeft <= 0) {
    return "This Shieldmate invite ended after 14 days. Your friend didn't join in time. You can keep your spot on your own.";
  }
  const days = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  return `Waiting for your Shieldmate: ${days} left.`;
}
