import { describe, expect, it } from "vitest";
import { GHOST_CLICK_MS, sheetOpenBlocked } from "./sheet-guard";

describe("sheet close does not open the next sheet", () => {
  it("blocks an open in the ghost-click window and allows one after", () => {
    const closedAt = 1_000;
    expect(sheetOpenBlocked(closedAt, closedAt + 50)).toBe(true);
    expect(sheetOpenBlocked(closedAt, closedAt + GHOST_CLICK_MS - 1)).toBe(true);
    expect(sheetOpenBlocked(closedAt, closedAt + GHOST_CLICK_MS)).toBe(false);
    expect(sheetOpenBlocked(null, closedAt)).toBe(false);
  });
});
