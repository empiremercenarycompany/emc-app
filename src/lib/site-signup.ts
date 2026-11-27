import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTimeslotId, type TableSlotId } from "@/lib/rules/saturday-tables";
import { isGameGridSrc, normalizeMembershipNumber, parseGymMember, type GymMember } from "@/lib/rules/public-copy";

export type SiteSignupSeed = {
  onFile: boolean;
  name: string;
  age: string;
  gymMember: GymMember | "";
  membershipNumber: string;
  timeslot: TableSlotId | "";
  dnd: string;
  gym: string;
  phone: string;
  species: string;
  classIdea: string;
  backstory: string;
  goals: string[];
  withFriend: boolean;
  friendName: string;
  anyOpen: boolean;
  signupSrc: string;
  writNumber: string;
};

const EMPTY: SiteSignupSeed = {
  onFile: false,
  name: "",
  age: "",
  gymMember: "",
  membershipNumber: "",
  timeslot: "",
  dnd: "never",
  gym: "new",
  phone: "",
  species: "",
  classIdea: "",
  backstory: "",
  goals: [],
  withFriend: false,
  friendName: "",
  anyOpen: false,
  signupSrc: "",
  writNumber: "",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function ageFromSite(value: string): string {
  if (value === "adult") return "18_plus";
  if (value === "age_16_17") return "16_17";
  if (value === "under_16") return "under_16";
  return "";
}

export function dndFromSite(value: string): string {
  const key = value.toLowerCase();
  if (key === "none" || key === "never") return "never";
  if (key === "a_little" || key === "some" || key === "a_few") return "a_few";
  if (key === "experienced" || key === "lots") return "lots";
  return "never";
}

export function gymFromSite(value: string): string {
  const key = value.toLowerCase();
  if (key === "new" || key === "some" || key === "regular") return key;
  return "new";
}

export function mapSiteSignup(row: Record<string, unknown> | null): SiteSignupSeed {
  if (!row) return EMPTY;
  const src = text(row.signup_src).slice(0, 80);
  const writ = isGameGridSrc(src) ? text(row.writ_number).toUpperCase().slice(0, 20) : "";
  const goals = text(row.fitness_goals);
  return {
    onFile: true,
    name: text(row.name),
    age: ageFromSite(text(row.age_group)),
    gymMember: parseGymMember(text(row.gym_membership_status)) ?? "",
    membershipNumber: normalizeMembershipNumber(text(row.gym_membership_number ?? "")),
    timeslot: normalizeTimeslotId(text(row.preferred_slot)) ?? "",
    dnd: dndFromSite(text(row.dnd_experience)),
    gym: gymFromSite(text(row.fitness_experience)),
    phone: text(row.phone),
    species: text(row.species_idea),
    classIdea: text(row.class_idea),
    backstory: text(row.backstory_idea),
    goals: goals ? [goals.slice(0, 80)] : [],
    withFriend: row.joining_with_friend === true,
    friendName: text(row.friend_name),
    anyOpen: row.any_open_slot === true,
    signupSrc: src,
    writNumber: writ,
  };
}

export async function loadOwnSiteSignup(supabase: SupabaseClient): Promise<SiteSignupSeed> {
  const { data, error } = await supabase.rpc("own_site_signup");
  if (error || !data || typeof data !== "object") return EMPTY;
  return mapSiteSignup(data as Record<string, unknown>);
}
