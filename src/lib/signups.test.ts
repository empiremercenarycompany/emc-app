import { describe, expect, it } from "vitest";
import { noticeBody, noticeFields, SIGNUP_COLUMNS, type SignupRecord } from "@/lib/notify/signup-fields";
import { signupsCsv } from "@/lib/signups";

const row: SignupRecord = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "recruit@example.test",
  displayName: "Recruit Example",
  role: "player",
  joined: "2026-11-19T00:00:00.000Z",
  phone: "=208-555-0100",
  trainingSlot: "9 AM–12 PM",
  speciesIdea: "human",
  classIdea: "fighter",
  fitnessGoals: "Sleep 7 hours, Read 20 min",
  gymExperience: "New",
  fitnessExperience: "Walks most days",
  dndExperience: "Never",
  sessionReminders: "yes",
  backstory: 'Raised near the docks.\nThey said "come along".',
  empireMembership: "Current Empire member",
  membershipNumber: "ESF-1001",
  membershipVerified: "no",
  verifiedBy: "",
  verifiedAt: "",
  signupSrc: "gamegrid-writ",
  tableLabel: "Saturday mornings, 9 AM to 12 PM, first game Jan 2, 2027",
  tableRequest: "Staff confirm every seat.",
  tableSquad: "CCC",
  withFriend: "no",
  friendName: "",
};

describe("sign-up export", () => {
  it("lists every account and intake field", () => {
    const fields = noticeFields(row);
    expect(fields.map((field) => field.label)).toEqual(SIGNUP_COLUMNS.map((column) => column.label));
    expect(noticeBody(fields)).toContain("Email: recruit@example.test");
    expect(noticeBody(fields)).toContain("Backstory: Raised near the docks.");
    expect(noticeBody([{ label: "Phone", value: "  " }])).toBe("Phone: —");
  });

  it("quotes commas and neutralizes a spreadsheet formula", () => {
    const csv = signupsCsv([row]);
    expect(csv.startsWith("\uFEFFUser id,Email,Display name")).toBe(true);
    expect(csv).toContain("recruit@example.test");
    expect(csv).toContain("'=208-555-0100");
    expect(csv).toContain('"Raised near the docks.\nThey said ""come along""."');
    expect(csv).not.toMatch(/personal training/i);
    expect(csv).not.toMatch(/battle master/i);
  });
});
