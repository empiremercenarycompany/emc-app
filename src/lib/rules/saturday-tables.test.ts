import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";
import {
  askStaffMailto,
  buildSaturdayHall,
  emailAskedLine,
  hallForApp,
  nextPairTable,
  normalizeTimeslotId,
  seatLine,
  tableRequest,
} from "./saturday-tables";

const ROOT = path.resolve(__dirname, "../../..");

describe("saturday table copy", () => {
  it("keeps Strategy's locked labels and sentences", () => {
    expect(Object.values(SATURDAY_TABLE_COPY.labels)).toEqual([
      "Saturday mornings, 9 AM to 12 PM, first game Jan 2, 2027",
      "Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027",
      "Saturday evenings, 7 PM to 10 PM, first game Jan 2, 2027",
      "Saturday mornings, 9 AM to 12 PM, first game Jan 9, 2027",
      "Saturday afternoons, 2 PM to 5 PM, first game Jan 9, 2027",
      "Saturday evenings, 7 PM to 10 PM, first game Jan 9, 2027",
    ]);
    expect(SATURDAY_TABLE_COPY.sitTogether).toBe(
      "You'll sit together at this table. Your friend has 14 days to ENLIST.",
    );
    expect(SATURDAY_TABLE_COPY.askStaff).toBe("Ask staff");
    expect(SATURDAY_TABLE_COPY.askStaffSubject).toBe("Shieldmate seats");
    expect(SATURDAY_TABLE_COPY.askStaffEmail).toBe("empiremercenarycompany@gmail.com");
    expect(SATURDAY_TABLE_COPY.full).toBe("Full");
    expect(SATURDAY_TABLE_COPY.squadForming).toBe("Squad forming");
    const file = readFileSync(path.join(ROOT, "src/content/saturday-tables.ts"), "utf8");
    expect(file).not.toMatch(/\u2014/);
    expect(file).not.toMatch(/18\+/);
    expect(file).not.toMatch(/Empire Gym/);
    expect(file).not.toMatch(/battle master/i);
    expect(file).not.toMatch(/\bpoints?\b/i);
    expect(file).not.toMatch(/Cold Cut|Red Bull|New squad/);
  });
});

describe("slot ids", () => {
  it("maps the site daytime id onto the app afternoon id", () => {
    expect(normalizeTimeslotId("daytime")).toBe("afternoon");
    expect(normalizeTimeslotId(" DAYTIME ")).toBe("afternoon");
    expect(normalizeTimeslotId("afternoon")).toBe("afternoon");
    expect(normalizeTimeslotId("morning")).toBe("morning");
    expect(normalizeTimeslotId("evening")).toBe("evening");
    expect(normalizeTimeslotId("noon")).toBeNull();
    expect(normalizeTimeslotId("")).toBeNull();
  });
});

describe("saturday hall", () => {
  const squads = [
    { id: "ccc", name: "CCC", timeslotId: "morning", startsOn: "2027-01-02", placed: 2 },
    { id: "rbm", name: "RBM", timeslotId: "evening", startsOn: "2027-01-02", placed: 6 },
    { id: "blank", name: "  ", timeslotId: "afternoon", startsOn: "2027-01-09", placed: 0 },
  ];

  it("shows six tables, real placed seats, and only existing squad names", () => {
    const hall = hallForApp(squads, true);
    expect(hall.map((table) => table.label)).toEqual(Object.values(SATURDAY_TABLE_COPY.labels));
    expect(hall).toHaveLength(6);
    expect(hall[0]?.squadLine).toBe("CCC");
    expect(hall[0]?.seatsLeft).toBe(4);
    expect(seatLine(4)).toBe("4 of 6 seats left");
    expect(hall[1]?.squadLine).toBe("Squad forming");
    expect(hall[1]?.seatsLeft).toBe(6);
    expect(hall[2]?.squadLine).toBe("RBM");
    expect(hall[2]?.seatsLeft).toBe(0);
    expect(seatLine(0)).toBe("Full");
    expect(hall[5]?.squadLine).toBe("Squad forming");
    expect(hall[5]?.squadId).toBeNull();
    expect(hall.every((table) => !table.label.includes(table.squadLine ?? "CCC"))).toBe(true);
  });

  it("hides squad names when the caller is outside the signed-in app", () => {
    const hall = hallForApp(squads, false);
    expect(hall.every((table) => table.squadLine === null && table.squadId === null)).toBe(true);
    expect(hall[0]?.seatsLeft).toBe(4);
    expect(hall[2]?.seatsLeft).toBe(0);
  });

  it("does not invent a filling band or a leftover guess", () => {
    expect(seatLine(1)).toBe("1 of 6 seats left");
    expect(seatLine(2)).toBe("2 of 6 seats left");
    expect(seatLine(6)).toBe("6 of 6 seats left");
    expect(buildSaturdayHall([], true).every((table) => table.placed === 0 && table.seatsLeft === 6)).toBe(true);
  });

  it("keeps a full table selectable as a waitlist, and asks staff for a pair on one seat", () => {
    expect(tableRequest(0, false)).toBe("waitlist");
    expect(tableRequest(0, true)).toBe("waitlist");
    expect(tableRequest(1, true)).toBe("ask_staff");
    expect(tableRequest(1, false)).toBe("seat");
    expect(tableRequest(2, true)).toBe("seat");
    const hall = hallForApp(
      [{ id: "one", name: "CCC", timeslotId: "morning", startsOn: "2027-01-02", placed: 5 }],
      true,
    );
    expect(hall.filter((table) => table.seatsLeft === 0)).toHaveLength(0);
    expect(hall).toHaveLength(6);
    const next = nextPairTable(hall, hall[0]!.key);
    expect(next?.seatsLeft).toBeGreaterThanOrEqual(2);
    expect(next?.key).not.toBe(hall[0]?.key);
  });

  it("opens mail for Ask staff with the subject and the table label", () => {
    const label = SATURDAY_TABLE_COPY.labels["afternoon:2027-01-02"];
    const href = askStaffMailto(label);
    expect(href.startsWith("mailto:empiremercenarycompany@gmail.com?")).toBe(true);
    expect(href).toContain(`subject=${encodeURIComponent("Shieldmate seats")}`);
    expect(href).toContain(`body=${encodeURIComponent(label)}`);
    expect(decodeURIComponent(href)).not.toContain("18+");
  });

  it("uses the locked email sentence", () => {
    expect(emailAskedLine("Saturday evenings, 7 PM to 10 PM, first game Jan 9, 2027")).toBe(
      "You asked for Saturday evenings, 7 PM to 10 PM, first game Jan 9, 2027, at Empire Strength and Fitness, 1539 E Piper St, Idaho Falls. Your squad is set by the session time you choose. Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.",
    );
  });
});
