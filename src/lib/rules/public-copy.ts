/** Schedule price note. $120 is first. $60 is only for a current Empire member. */
export const SCHEDULE_PRICE_COPY =
  "Founding Recruit Rate: $120/month with your Empire Strength and Fitness membership included, or $60/month if you're already a current Empire member. No payments are taken in the app.";

/** One-line price anywhere else in the app. */
export const PRICE_ONE_LINE = "$120/month with gym membership included. Current Empire members: $60/month.";

/** Codex FAQ cost entry. No Shieldmate mention. */
export const FAQ_COST_COPY =
  "$120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Month to month, cancel anytime.";

export const PAYMENT_STEP = "Once staff confirm your seat, they'll send you a payment link.";

export const GYM_MEMBER_OPTIONS = [
  { id: "not_yet", label: "I'm not an Empire member yet: $120/month, gym membership included" },
  { id: "former", label: "I used to be an Empire member: $120/month, gym membership included" },
  { id: "current", label: "I'm a current Empire member: $60/month, added to my membership" },
] as const;

export type GymMember = (typeof GYM_MEMBER_OPTIONS)[number]["id"];

export const GYM_MEMBER_HELPER =
  "The $60 rate needs a current Empire Strength and Fitness membership. Not sure if yours is active? Pick $120 and staff will sort it out when they confirm your seat.";

export const VERIFY_MEMBERSHIP_NOTE = "Verify membership before sending the $60 link.";

export const PLAN_LABEL_STANDARD = "Gym included: $120/month";
export const PLAN_LABEL_MEMBER = "Current Empire member: $60/month";

export const PRODUCT_NAME_STANDARD = "EMC Founding Recruit Rate, gym included";
export const PRODUCT_NAME_MEMBER = "EMC Founding Recruit Rate, current Empire members";

export const GAMEGRID_WRIT_SRC = "gamegrid-writ";
export const GAMEGRID_WRIT_LINE =
  "You came in on an Enlistment Writ, so your first Game Grid paint night is on the Company. Bring your writ.";

/** Final age rule. The 7–10 PM slot stays 18+. */
export const AGE_RULE =
  "The Company is for ages 16 and up. Players who are 16 or 17 enlist themselves. No guardian is needed on the form. They can choose the 9 AM–12 PM or 2–5 PM slot. The 7–10 PM slot is for ages 18 and up, until there is demand for a teen group. If you are under 16, you can join a teen waitlist. If enough younger players are interested, a teen squad may start later.";

export function isGymMember(value: string | null | undefined): value is GymMember {
  return value === "current" || value === "former" || value === "not_yet";
}

export function parseGymMember(value: string | null | undefined): GymMember | null {
  const text = (value ?? "").trim().toLowerCase().replace(/-/g, "_");
  return isGymMember(text) ? text : null;
}

export function gymMemberLabel(value: GymMember | null): string {
  if (value === "current") return "Current Empire member";
  if (value === "former") return "Former Empire member";
  if (value === "not_yet") return "Not an Empire member yet";
  return "";
}

/** A gamegrid arrival leads with the $120 price. The stored src is unchanged. */
export function gamegridLead(src: string | null | undefined): boolean {
  return (src ?? "").trim().toLowerCase().startsWith("gamegrid");
}

export function confirmationRateLine(gymMember: GymMember | null): string {
  if (gymMember === "current") {
    return "Your rate: $60 a month, the Founding Recruit Rate for current Empire members, added to the membership you already have. Staff will check your membership when they confirm your seat.";
  }
  if (gymMember === "former" || gymMember === "not_yet") {
    return "Your rate: $120 a month, the Founding Recruit Rate with your Empire Strength and Fitness membership included.";
  }
  return "Your rate: $120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Staff will confirm which applies when they confirm your seat.";
}

export function gamegridWritLine(src: string | null | undefined): string | null {
  return (src ?? "").trim() === GAMEGRID_WRIT_SRC ? GAMEGRID_WRIT_LINE : null;
}
