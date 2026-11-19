import type { SupabaseClient } from "@supabase/supabase-js";
import { SIGNUP_COLUMNS, type SignupRecord } from "@/lib/notify/signup-fields";
import { displaySlot, dndLabel, gymLabel } from "@/lib/rules/intake";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function goalsText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
}

function csvCell(value: string): string {
  let text = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function signupsCsv(rows: SignupRecord[]): string {
  const header = SIGNUP_COLUMNS.map((column) => csvCell(column.label)).join(",");
  const lines = rows.map((row) => SIGNUP_COLUMNS.map((column) => csvCell(row[column.key])).join(","));
  return `\uFEFF${[header, ...lines].join("\n")}\n`;
}

type ProfileRow = {
  id?: unknown;
  email?: unknown;
  display_name?: unknown;
  app_role?: unknown;
  created_at?: unknown;
};

type IntakeRow = {
  user_id?: unknown;
  phone?: unknown;
  species_idea?: unknown;
  class_idea?: unknown;
  backstory_idea?: unknown;
  fitness_experience?: unknown;
  first_goals?: unknown;
  dnd_experience?: unknown;
  gym_experience?: unknown;
  timeslot_id?: unknown;
  session_reminders?: unknown;
};

type SlotRow = { id?: unknown; label?: unknown; adults_only?: unknown };

export async function loadSignups(
  supabase: SupabaseClient,
): Promise<{ rows: SignupRecord[]; error: string | null }> {
  const [profiles, intake, slots] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, app_role, created_at").order("created_at", { ascending: false }),
    supabase
      .from("player_intake")
      .select(
        "user_id, phone, species_idea, class_idea, backstory_idea, fitness_experience, first_goals, dnd_experience, gym_experience, timeslot_id, session_reminders",
      ),
    supabase.from("session_timeslots").select("id, label, adults_only"),
  ]);
  if (profiles.error || intake.error) return { rows: [], error: "Sign-ups could not be loaded." };

  const slotById = new Map<string, { label: string; adultsOnly: boolean }>();
  for (const slot of (slots.data ?? []) as SlotRow[]) {
    const id = clean(slot.id);
    if (!id) continue;
    slotById.set(id, { label: clean(slot.label) || id, adultsOnly: Boolean(slot.adults_only) });
  }

  const intakeByUser = new Map<string, IntakeRow>();
  for (const row of (intake.data ?? []) as IntakeRow[]) {
    const id = clean(row.user_id);
    if (id) intakeByUser.set(id, row);
  }

  const rows = ((profiles.data ?? []) as ProfileRow[]).map((profile) => {
    const userId = clean(profile.id);
    const details = intakeByUser.get(userId);
    const timeslotId = clean(details?.timeslot_id);
    const slot = timeslotId ? slotById.get(timeslotId) : undefined;
    const dnd = clean(details?.dnd_experience);
    const gym = clean(details?.gym_experience);
    return {
      userId,
      email: clean(profile.email),
      displayName: clean(profile.display_name),
      role: clean(profile.app_role),
      joined: clean(profile.created_at),
      phone: clean(details?.phone),
      trainingSlot: slot ? displaySlot(slot.label, slot.adultsOnly) : timeslotId,
      speciesIdea: clean(details?.species_idea),
      classIdea: clean(details?.class_idea),
      fitnessGoals: goalsText(details?.first_goals),
      gymExperience: gym ? gymLabel(gym) : "",
      fitnessExperience: clean(details?.fitness_experience),
      dndExperience: dnd ? dndLabel(dnd) : "",
      sessionReminders: details ? (details.session_reminders ? "yes" : "no") : "",
      backstory: clean(details?.backstory_idea),
    };
  });

  return { rows, error: null };
}
