import { SATURDAY_TABLE_COPY, type SaturdayTableKey } from "@/content/saturday-tables";

/**
 * Slot ids.
 * The app stores morning, afternoon, and evening on session_timeslots.
 * The public site uses daytime for the 2 to 5 PM block. daytime is accepted
 * and stored as afternoon. It is not a fourth slot, and this does not rewrite
 * rows that are already saved.
 */
const SLOT_IDS = {
  morning: "morning",
  afternoon: "afternoon",
  daytime: "afternoon",
  evening: "evening",
} as const;

export const TABLE_SLOTS = ["morning", "afternoon", "evening"] as const;
export const TABLE_STARTS = ["2027-01-02", "2027-01-09"] as const;
export const TABLE_SIZE = 6;

export type TableSlotId = (typeof TABLE_SLOTS)[number];
export type TableStart = (typeof TABLE_STARTS)[number];
export type TableRequest = "seat" | "waitlist" | "ask_staff";

export type SaturdayTable = {
  key: SaturdayTableKey;
  timeslotId: TableSlotId;
  startsOn: TableStart;
  label: string;
  squadId: string | null;
  /** Null hides the line. A real squad name, or Squad forming when the app has no name yet. */
  squadLine: string | null;
  placed: number;
  seatsLeft: number;
};

export type PlacedSquad = {
  id: string;
  name: string;
  timeslotId: string;
  startsOn: string;
  placed: number;
};

export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => String(values[key] ?? ""));
}

/** Site id daytime and app id afternoon are the same 2 to 5 PM block. */
export function normalizeTimeslotId(value: string | null | undefined): TableSlotId | null {
  const key = (value ?? "").trim().toLowerCase();
  if (!key) return null;
  return SLOT_IDS[key as keyof typeof SLOT_IDS] ?? null;
}

export function tableKey(timeslotId: string, startsOn: string): SaturdayTableKey | null {
  const slot = normalizeTimeslotId(timeslotId);
  if (!slot) return null;
  if (startsOn !== "2027-01-02" && startsOn !== "2027-01-09") return null;
  const key = `${slot}:${startsOn}` as SaturdayTableKey;
  return key in SATURDAY_TABLE_COPY.labels ? key : null;
}

export function tableLabel(timeslotId: string, startsOn: string): string | null {
  const key = tableKey(timeslotId, startsOn);
  return key ? SATURDAY_TABLE_COPY.labels[key] : null;
}

/** Staff-placed seats only. Pending requests are not seats. No guessed scarcity. */
export function seatsLeftFromPlaced(placed: number): number {
  const count = Number.isFinite(placed) ? Math.max(0, Math.floor(placed)) : 0;
  return Math.max(0, TABLE_SIZE - count);
}

export function seatLine(seatsLeft: number): string {
  if (seatsLeft <= 0) return SATURDAY_TABLE_COPY.full;
  return fillCopy(SATURDAY_TABLE_COPY.seatsLeft, { n: seatsLeft });
}

export function squadLineFor(name: string | null | undefined, showNames: boolean): string | null {
  if (!showNames) return null;
  const trimmed = (name ?? "").trim();
  return trimmed || SATURDAY_TABLE_COPY.squadForming;
}

export function buildSaturdayHall(squads: PlacedSquad[], showNames: boolean): SaturdayTable[] {
  const tables: SaturdayTable[] = [];
  for (const startsOn of TABLE_STARTS) {
    for (const timeslotId of TABLE_SLOTS) {
      const key = `${timeslotId}:${startsOn}` as SaturdayTableKey;
      const matches = squads.filter(
        (squad) => normalizeTimeslotId(squad.timeslotId) === timeslotId && squad.startsOn === startsOn,
      );
      const named = matches.find((squad) => squad.name.trim());
      const squad = named ?? matches[0] ?? null;
      const placed = squad ? Math.max(0, squad.placed) : 0;
      tables.push({
        key,
        timeslotId,
        startsOn,
        label: SATURDAY_TABLE_COPY.labels[key],
        squadId: showNames && squad ? squad.id : null,
        squadLine: squadLineFor(squad?.name, showNames && Boolean(squad)),
        placed,
        seatsLeft: seatsLeftFromPlaced(placed),
      });
    }
  }
  return tables;
}

/**
 * A squad with no row yet still shows Squad forming inside the app.
 * Logged-out callers pass showNames false and get no squad line.
 */
export function hallForApp(squads: PlacedSquad[], showNames: boolean): SaturdayTable[] {
  return buildSaturdayHall(squads, showNames).map((table) => {
    if (!showNames || table.squadLine) return table;
    return { ...table, squadLine: SATURDAY_TABLE_COPY.squadForming };
  });
}

export function tableRequest(seatsLeft: number, withFriend: boolean): TableRequest {
  if (seatsLeft <= 0) return "waitlist";
  if (withFriend && seatsLeft === 1) return "ask_staff";
  return "seat";
}

/** The next table in label order that can seat a pair. Wraps once. */
export function nextPairTable(tables: SaturdayTable[], selectedKey: string): SaturdayTable | null {
  const index = tables.findIndex((table) => table.key === selectedKey);
  if (index < 0) return null;
  for (let step = 1; step < tables.length; step += 1) {
    const candidate = tables[(index + step) % tables.length];
    if (candidate && candidate.seatsLeft >= 2) return candidate;
  }
  return null;
}

export function askedForLine(label: string): string {
  return fillCopy(SATURDAY_TABLE_COPY.askedFor, { table_label: label });
}

export function yourTableLine(label: string): string {
  return fillCopy(SATURDAY_TABLE_COPY.yourTableLine, { table_label: label });
}

export function emailAskedLine(label: string): string {
  return fillCopy(SATURDAY_TABLE_COPY.emailAsked, { table_label: label });
}

export function nextTogetherLine(label: string): string {
  return fillCopy(SATURDAY_TABLE_COPY.nextTogether, { table_label: label });
}

/** Opens the person's mail app. The body is only the table label. */
export function askStaffMailto(tableLabelText: string): string {
  const subject = encodeURIComponent(SATURDAY_TABLE_COPY.askStaffSubject);
  const body = encodeURIComponent(tableLabelText);
  return `mailto:${SATURDAY_TABLE_COPY.askStaffEmail}?subject=${subject}&body=${body}`;
}

export function requestPhrase(request: string): string {
  if (request === "waitlist") return SATURDAY_TABLE_COPY.joinWaitlist;
  if (request === "ask_staff") return SATURDAY_TABLE_COPY.askStaff;
  if (request === "seat") return SATURDAY_TABLE_COPY.staffConfirm;
  return "";
}
