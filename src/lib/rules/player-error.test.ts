import { describe, expect, it } from "vitest";
import { playerError } from "./player-error";

describe("player-facing database errors", () => {
  it("hides a raw unique constraint and keeps a company sentence", () => {
    const filed = playerError(
      'duplicate key value violates unique constraint "weekly_checkins_character_id_week_start_key"',
    );
    expect(filed).toBe("This week is already filed. Your answers are on the form.");
    expect(filed.toLowerCase()).not.toContain("duplicate");
    expect(filed).not.toContain("weekly_checkins");
    expect(playerError('duplicate key value violates unique constraint "goals_pkey"')).toBe("That is already saved.");
    expect(playerError("That week has not started")).toBe("That week has not started");
    expect(playerError("Check-in is closed for that week")).toBe("Check-in is closed for that week");
    expect(playerError('null value in column "title" violates not-null constraint')).toBe(
      "That could not be saved. Try again, or tell your coach.",
    );
  });
});
