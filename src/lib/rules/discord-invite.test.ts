import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discordInviteUrl, discordProgramForPath } from "./discord-invite";

const ROOT = path.resolve(__dirname, "../../..");

describe("discord invites", () => {
  it("picks the program from the path and hides an unset invite", () => {
    expect(discordProgramForPath("/intake")).toBe("emc");
    expect(discordProgramForPath("/wanderlust")).toBe("wanderlust");
    expect(discordProgramForPath("/wanderlust/signup")).toBe("wanderlust");
    expect(discordInviteUrl("emc", {})).toBeNull();
    expect(discordInviteUrl("wanderlust", { WANDERLUST_DISCORD_INVITE_URL: "  " })).toBeNull();
    expect(discordInviteUrl("emc", { EMC_DISCORD_INVITE_URL: "not a url" })).toBeNull();
    expect(discordInviteUrl("emc", { EMC_DISCORD_INVITE_URL: "https://discord.gg/example" })).toBe(
      "https://discord.gg/example",
    );
    expect(discordInviteUrl("wanderlust", { WANDERLUST_DISCORD_INVITE_URL: "https://discord.gg/grid" })).toBe(
      "https://discord.gg/grid",
    );
  });

  it("does not hardcode either invite", () => {
    const source = readFileSync(path.join(ROOT, "src/lib/rules/discord-invite.ts"), "utf8");
    const footer = readFileSync(path.join(ROOT, "src/components/site-footer.tsx"), "utf8");
    expect(source).not.toContain("discord.gg/");
    expect(footer).not.toContain("discord.gg/");
    expect(footer).toContain("discordInviteUrl");
  });
});
