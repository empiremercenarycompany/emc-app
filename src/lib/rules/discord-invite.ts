export type DiscordProgram = "emc" | "wanderlust";

const ENV_KEY = {
  emc: "EMC_DISCORD_INVITE_URL",
  wanderlust: "WANDERLUST_DISCORD_INVITE_URL",
} as const;

/** Wanderlust sign-up paths use the Game Grid invite. Every other path is EMC. */
export function discordProgramForPath(pathname: string): DiscordProgram {
  return /(?:^|\/)wanderlust(?:\/|$)/i.test(pathname) ? "wanderlust" : "emc";
}

/** The configured https invite, or null when that program's env value is unset. */
export function discordInviteUrl(
  program: DiscordProgram,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const value = env[ENV_KEY[program]]?.trim() ?? "";
  if (!value.startsWith("https://")) return null;
  return value;
}
