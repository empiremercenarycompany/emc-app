import { describe, expect, it } from "vitest";
import { cohortAdventure, cohortBeginsLine, postedSessionLine } from "./adventures";
import { attendanceOpen, earliestTableSession } from "./table-sessions";

describe("posted table sessions", () => {
  const rows = [
    { session_date: "2026-10-24", squad_id: null, off_week: false },
    { session_date: "2026-11-07", squad_id: null, off_week: false },
    { session_date: "2026-11-14", squad_id: "squad-a", off_week: false },
    { session_date: "2026-11-01", squad_id: "squad-b", off_week: false },
    { session_date: "2026-11-03", squad_id: null, off_week: true },
  ];

  it("picks the earliest guild-wide date on or after today", () => {
    expect(earliestTableSession(rows, "2026-10-31", null)).toBe("2026-11-07");
    expect(earliestTableSession(rows, "2026-11-07", "squad-a")).toBe("2026-11-07");
  });

  it("includes the viewer's squad and skips other squads and off weeks", () => {
    expect(earliestTableSession(rows, "2026-11-08", "squad-a")).toBe("2026-11-14");
    expect(earliestTableSession(rows, "2026-11-08", null)).toBeNull();
  });

  it("opens table attendance only on that session's date", () => {
    expect(attendanceOpen("2026-11-07", "2026-11-07")).toBe(true);
    expect(attendanceOpen("2026-11-07T00:00:00", "2026-11-07")).toBe(true);
    expect(attendanceOpen("2026-11-07", "2026-11-06")).toBe(false);
    expect(attendanceOpen("2026-11-14", "2026-11-07")).toBe(false);
    expect(attendanceOpen(null, "2026-11-07")).toBe(false);
  });
});

describe("adventure labels", () => {
  const adventures = [
    { title: "Old campaign", number: 1, start_date: "2026-01-01", status: "closed" },
    { title: "Adventure 2", number: 2, start_date: null, status: "active" },
    { title: "Adventure 3", number: 3, start_date: "2027-01-02", status: "upcoming" },
    { title: "Adventure 4", number: 4, start_date: "2027-06-01", status: "upcoming" },
  ];

  it("names the lowest-numbered open adventure that already has a start", () => {
    expect(cohortAdventure(adventures, "2027-01-02")).toEqual({ title: "Adventure 3", start: "2027-01-02" });
    expect(cohortBeginsLine("Adventure 3", "2027-01-02")).toBe("Adventure 3 begins Saturday, Jan 2");
    expect(cohortAdventure(adventures, null)).toBeNull();
    expect(
      cohortAdventure([{ title: "Adventure 2", number: 2, start_date: null, status: "active" }], "2027-01-02"),
    ).toBeNull();
  });

  it("shows a table session's adventure without repeating the spoken date", () => {
    expect(
      postedSessionLine({
        title: "Adventure 2 · Episode: Saturday, Nov 7",
        adventureTitle: "Adventure 2",
        sessionDate: "2026-11-07",
      }),
    ).toBe("Adventure 2 · Episode: Saturday, Nov 7");
    expect(
      postedSessionLine({ title: "Episode", adventureTitle: "Adventure 2", sessionDate: "2026-11-07" }),
    ).toBe("Adventure 2 · Episode · Saturday, Nov 7");
  });
});
