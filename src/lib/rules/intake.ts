import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";

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

/** Keep these in step with save_player_intake. */
export const ENLIST_LIMITS = {
  phone: 40,
  species: 80,
  classIdea: 80,
  fitness: 600,
  backstory: 2000,
} as const;

const PHONE_PATTERN = /^[0-9+(). -]{7,40}$/;

export const TIMESLOT_FALLBACK = [
  { id: "morning", label: "9 AM–12 PM" },
  { id: "afternoon", label: "2–5 PM" },
  { id: "evening", label: "7–10 PM" },
] as const;

const KNOWN_SLOTS: Record<string, string> = {
  "9–12": "9 AM–12 PM",
  "9-12": "9 AM–12 PM",
  "2–5": "2–5 PM",
  "2-5": "2–5 PM",
  "7–10": "7–10 PM",
  "7-10": "7–10 PM",
  "7–10 PM": "7–10 PM",
  "7-10 PM": "7–10 PM",
};

/** Spoken clock time. A stored "(18+)" suffix is dropped. Age rules sit beside the list. */
export function displaySlot(label: string): string {
  const stripped = label.replace(/\s*\(18\+\)\s*$/, "").trim();
  return KNOWN_SLOTS[stripped] ?? stripped;
}

export const AGE_BANDS = [
  { id: "under_16", label: "Under 16" },
  { id: "16_17", label: "16 or 17" },
  { id: "18_plus", label: "18 or older" },
] as const;

export type AgeBand = (typeof AGE_BANDS)[number]["id"];

export function isAgeBand(value: string): value is AgeBand {
  return AGE_BANDS.some((band) => band.id === value);
}

/** Under 16 sees no seat. Every other age, including a blank age, sees every slot. */
export function slotsForAge<T>(age: string, slots: T[]): T[] {
  if (age === "under_16") return [];
  return slots;
}

export type IntakeDraft = {
  dnd: string;
  gym: string;
  goals: string[];
  timeslot: string;
  /** Omitted on the reminder save, which does not change age. */
  age?: string;
};

export function dndLabel(id: string): string {
  return DND_LEVELS.find((row) => row.id === id)?.label ?? id;
}

export function gymLabel(id: string): string {
  return GYM_LEVELS.find((row) => row.id === id)?.label ?? id;
}

export type EnlistDraft = {
  phone: string;
  species: string;
  classIdea: string;
  fitness: string;
  backstory: string;
};

export function enlistError(input: EnlistDraft): string | null {
  const phone = input.phone.trim();
  const species = input.species.trim();
  const classIdea = input.classIdea.trim();
  const fitness = input.fitness.trim();
  const backstory = input.backstory.trim();
  if (phone && (phone.length > ENLIST_LIMITS.phone || !PHONE_PATTERN.test(phone))) {
    return "Use a phone number, or leave it blank.";
  }
  if (species.length > ENLIST_LIMITS.species) return "Use a shorter species idea.";
  if (classIdea.length > ENLIST_LIMITS.classIdea) return "Use a shorter class idea.";
  if (fitness.length > ENLIST_LIMITS.fitness) return "Use a shorter fitness note.";
  if (backstory.length > ENLIST_LIMITS.backstory) return "Use a shorter backstory.";
  return null;
}

export function intakeError(input: IntakeDraft): string | null {
  if (!DND_LEVELS.some((row) => row.id === input.dnd)) return "Say whether you have played before.";
  if (!GYM_LEVELS.some((row) => row.id === input.gym)) return "Say how the gym feels.";
  const goals = input.goals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length < 1) return "Pick at least one first goal.";
  if (input.age === undefined) {
    if (!input.timeslot) return SATURDAY_TABLE_COPY.heading;
    return null;
  }
  if (!isAgeBand(input.age)) return "Say your age.";
  if (input.age === "under_16") {
    if (input.timeslot) return "Under 16 joins the teen waitlist.";
    return null;
  }
  if (!input.timeslot) return SATURDAY_TABLE_COPY.heading;
  return null;
}

/** Beginner hints turn on for a first-time player or someone new to the gym. */
export function beginnerHints(input: { dnd: string; gym: string } | null): boolean {
  if (!input) return false;
  return input.dnd === "never" || input.gym === "new";
}
