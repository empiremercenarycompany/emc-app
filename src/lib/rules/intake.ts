export const DND_LEVELS = [
  { id: "never", label: "Never" },
  { id: "a_few", label: "A few times" },
  { id: "lots", label: "Lots" },
] as const;

export const GYM_LEVELS = [
  { id: "new", label: "New" },
  { id: "some", label: "Some" },
  { id: "regular", label: "Regular" },
] as const;

export const GOAL_CHIPS = ["Sleep 7 hours", "Read 20 min", "Call a friend"] as const;

export const TIMESLOT_FALLBACK = [
  { id: "morning", label: "9 AM–12 PM", adultsOnly: false },
  { id: "afternoon", label: "2–5 PM", adultsOnly: false },
  { id: "evening", label: "7–10 PM", adultsOnly: true },
] as const;

const KNOWN_SLOTS: Record<string, string> = {
  "9–12": "9 AM–12 PM",
  "9-12": "9 AM–12 PM",
  "2–5": "2–5 PM",
  "2-5": "2–5 PM",
  "7–10 PM": "7–10 PM",
  "7-10 PM": "7–10 PM",
};

/** Spoken clock time. Does not add a teen-squad line; that wording is not set. */
export function displaySlot(label: string, adultsOnly: boolean): string {
  const stripped = label.replace(/\s*\(18\+\)\s*$/, "").trim();
  const base = KNOWN_SLOTS[stripped] ?? stripped;
  return adultsOnly && !base.includes("(18+)") ? `${base} (18+)` : base;
}

export type IntakeDraft = {
  dnd: string;
  gym: string;
  goals: string[];
  timeslot: string;
};

export function intakeError(input: IntakeDraft): string | null {
  if (!DND_LEVELS.some((row) => row.id === input.dnd)) return "Say whether you have played before.";
  if (!GYM_LEVELS.some((row) => row.id === input.gym)) return "Say how the gym feels.";
  const goals = input.goals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length < 1) return "Pick at least one first goal.";
  if (!input.timeslot) return "Pick a time.";
  return null;
}

/** Beginner hints turn on for a first-time player or someone new to the gym. */
export function beginnerHints(input: { dnd: string; gym: string } | null): boolean {
  if (!input) return false;
  return input.dnd === "never" || input.gym === "new";
}
