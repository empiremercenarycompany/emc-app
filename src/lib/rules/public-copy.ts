/**
 * Pay-first line from the marketing lead. Use this wherever the payment step
 * is described. Do not promise a refund.
 */
export const PAYMENT_STEP =
  "Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.";

/** Schedule price note. $120 is first. $60 is only for a current Empire member. */
export const SCHEDULE_PRICE_COPY =
  "Founding Recruit Rate: $120/month with your Empire Strength and Fitness membership included, or $60/month if you're already a current Empire member. " +
  PAYMENT_STEP;

/** One-line price anywhere else in the app. */
export const PRICE_ONE_LINE = "$120/month with gym membership included. Current Empire members: $60/month.";

/** Codex FAQ cost entry. No Shieldmate mention. */
export const FAQ_COST_COPY =
  "$120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Month to month, cancel anytime.";

export const GYM_MEMBER_OPTIONS = [
  { id: "not_yet", label: "I'm not an Empire member yet: $120/month, gym membership included" },
  { id: "former", label: "I used to be an Empire member: $120/month, gym membership included" },
  { id: "current", label: "I'm a current Empire member: $60/month, added to my membership" },
] as const;

export type GymMember = (typeof GYM_MEMBER_OPTIONS)[number]["id"];

export const MEMBER_RATE_COPY =
  "Current Empire Strength and Fitness members pay $60 a month. Have your membership number handy? Add it. If not, leave it blank and staff will look you up.";

export const GYM_MEMBER_HELPER = MEMBER_RATE_COPY;

export const VERIFY_MEMBERSHIP_NOTE = "Verify membership before sending the $60 link.";

export const PLAN_LABEL_STANDARD = "Gym included: $120/month";
export const PLAN_LABEL_MEMBER = "Current Empire member: $60/month";

export const PRODUCT_NAME_STANDARD = "EMC Founding Recruit Rate, gym included";
export const PRODUCT_NAME_MEMBER = "EMC Founding Recruit Rate, current Empire members";

export const GAMEGRID_WRIT_SRC = "gamegrid-writ";
export const GAMEGRID_WRIT_LINE =
  "You came in on an Enlistment Writ. Your first Game Grid paint night is on the Company after your first paid month. Bring your writ.";

export const MEMBERSHIP_NUMBER_LABEL = "Empire membership number (optional)";
export const MEMBERSHIP_NUMBER_HINT =
  "Leave it blank if you don't have it handy. Staff will check your membership.";
export const MEMBERSHIP_NUMBER_STAFF = "No membership number on file. $60 is still allowed after you verify the membership.";

const MEMBERSHIP_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{0,39}$/;

/** A leading # and the spaces around it are not part of the number. Blank is allowed. */
export function normalizeMembershipNumber(value: string): string {
  return value.trim().replace(/^#+/, "").trim();
}

export function membershipNumberError(value: string): string | null {
  const text = normalizeMembershipNumber(value);
  if (!text) return null;
  if (!MEMBERSHIP_NUMBER_PATTERN.test(text)) return "Use the membership number from Empire Strength and Fitness.";
  return null;
}

/** Final age rule. Every Saturday slot is 16 and up. */
export const AGE_RULE =
  "The Company is for ages 16 and up. Players who are 16 or 17 enlist themselves. No guardian is needed on the form. They can choose any Saturday slot, including 7–10 PM. If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver. If you are under 16, you can join a teen waitlist. Teen nights will not happen unless there is a teen waitlist.";

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

/**
 * Game Grid arrival. The live site treats any src that contains "gamegrid"
 * as Game Grid, including src=fb-gamegrid. Matching is case-insensitive.
 * The stored src is unchanged.
 */
export function isGameGridSrc(src: string | null | undefined): boolean {
  return (src ?? "").toLowerCase().includes("gamegrid");
}

/** A Game Grid arrival leads with the $120 price. The stored src is unchanged. */
export function gamegridLead(src: string | null | undefined): boolean {
  return isGameGridSrc(src);
}

export function confirmationRateLine(gymMember: GymMember | null): string {
  if (gymMember === "current") {
    return `Your rate: $60 a month. ${MEMBER_RATE_COPY}`;
  }
  if (gymMember === "former" || gymMember === "not_yet") {
    return "Your rate: $120 a month, the Founding Recruit Rate with your Empire Strength and Fitness membership included.";
  }
  return "Your rate: $120 a month with your Empire Strength and Fitness membership included, or $60 a month if you're a current Empire member. Staff will confirm which applies when they confirm your seat.";
}

export function gamegridWritLine(src: string | null | undefined): string | null {
  return isGameGridSrc(src) ? GAMEGRID_WRIT_LINE : null;
}
