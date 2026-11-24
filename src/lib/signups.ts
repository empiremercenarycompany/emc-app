import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPeriodEnd } from "@/lib/billing/display";
import { isCheckoutPlan, type CheckoutPlan } from "@/lib/billing/price";
import { SIGNUP_COLUMNS, type SignupRecord } from "@/lib/notify/signup-fields";
import { displaySlot, dndLabel, gymLabel } from "@/lib/rules/intake";
import { gymMemberLabel, parseGymMember, type GymMember } from "@/lib/rules/public-copy";

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
  gym_member?: unknown;
  gym_membership_number?: unknown;
  membership_verified?: unknown;
  membership_verified_by?: unknown;
  membership_verified_at?: unknown;
  checkout_plan?: unknown;
  signup_src?: unknown;
};

const INTAKE_COLUMNS =
  "user_id, phone, species_idea, class_idea, backstory_idea, fitness_experience, first_goals, dnd_experience, gym_experience, timeslot_id, session_reminders, gym_member, gym_membership_number, membership_verified, membership_verified_by, membership_verified_at, checkout_plan, signup_src";
const INTAKE_BASE =
  "user_id, phone, species_idea, class_idea, backstory_idea, fitness_experience, first_goals, dnd_experience, gym_experience, timeslot_id, session_reminders";

export type SignupBilling = {
  gymMember: GymMember | null;
  membershipNumber: string;
  membershipVerified: boolean;
  verifiedBy: string;
  verifiedAt: string;
  staffPlan: CheckoutPlan | null;
};

type SlotRow = { id?: unknown; label?: unknown; adults_only?: unknown };

function missingColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .+ does not exist/i.test(error.message ?? "");
}

export async function loadSignups(
  supabase: SupabaseClient,
): Promise<{ rows: SignupRecord[]; billing: Record<string, SignupBilling>; error: string | null }> {
  const [profiles, intakeFirst, slots] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, app_role, created_at").order("created_at", { ascending: false }),
    supabase.from("player_intake").select(INTAKE_COLUMNS),
    supabase.from("session_timeslots").select("id, label, adults_only"),
  ]);
  const intake = missingColumn(intakeFirst.error)
    ? await supabase.from("player_intake").select(INTAKE_BASE)
    : intakeFirst;
  if (profiles.error || intake.error) return { rows: [], billing: {}, error: "Sign-ups could not be loaded." };

  const slotById = new Map<string, { label: string; adultsOnly: boolean }>();
  for (const slot of (slots.data ?? []) as SlotRow[]) {
    const id = clean(slot.id);
    if (!id) continue;
    slotById.set(id, { label: clean(slot.label) || id, adultsOnly: Boolean(slot.adults_only) });
  }

  const intakeByUser = new Map<string, IntakeRow>();
  const verifierIds = new Set<string>();
  for (const row of (intake.data ?? []) as IntakeRow[]) {
    const id = clean(row.user_id);
    if (!id) continue;
    intakeByUser.set(id, row);
    const verifier = clean(row.membership_verified_by);
    if (verifier) verifierIds.add(verifier);
  }

  const names = new Map<string, string>();
  if (verifierIds.size > 0) {
    const verifiers = await supabase.from("profiles").select("id, display_name").in("id", [...verifierIds]);
    for (const profile of (verifiers.data ?? []) as ProfileRow[]) {
      const id = clean(profile.id);
      if (id) names.set(id, clean(profile.display_name));
    }
  }

  const billing: Record<string, SignupBilling> = {};
  const rows = ((profiles.data ?? []) as ProfileRow[]).map((profile) => {
    const userId = clean(profile.id);
    const details = intakeByUser.get(userId);
    const timeslotId = clean(details?.timeslot_id);
    const slot = timeslotId ? slotById.get(timeslotId) : undefined;
    const dnd = clean(details?.dnd_experience);
    const gym = clean(details?.gym_experience);
    const gymMember = parseGymMember(clean(details?.gym_member));
    const membershipNumber = clean(details?.gym_membership_number);
    const verified = details?.membership_verified === true;
    const verifierId = clean(details?.membership_verified_by);
    const verifiedAt = formatPeriodEnd(clean(details?.membership_verified_at) || null) ?? "";
    const planText = clean(details?.checkout_plan);
    const staffPlan = isCheckoutPlan(planText) ? planText : null;
    billing[userId] = {
      gymMember,
      membershipNumber,
      membershipVerified: verified,
      verifiedBy: names.get(verifierId) || verifierId,
      verifiedAt,
      staffPlan,
    };
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
      empireMembership: gymMemberLabel(gymMember),
      membershipNumber,
      membershipVerified: details ? (verified ? "yes" : "no") : "",
      verifiedBy: names.get(verifierId) || "",
      verifiedAt,
      signupSrc: clean(details?.signup_src),
    };
  });

  return { rows, billing, error: null };
}
