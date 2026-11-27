import { johnChoices } from "@/config/johnChoices";
import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";
import {
  PAYMENT_STEP,
  confirmationRateLine,
  gamegridWritLine,
  type GymMember,
} from "@/lib/rules/public-copy";
import { emailAskedLine } from "@/lib/rules/saturday-tables";

/**
 * PLAYER CONFIRMATION EMAIL
 * Strategy draft B5 in EMC_copy_placeholder-fills-B1-B6_2026-11-23_v2.md.
 * The Questions line in that draft is still a contact placeholder, so it is left out.
 * The Nov 13 waiver paragraph was not supplied. CONFIRMATION_WAIVER_PARAGRAPH stays empty
 * until that text exists. confirmationEmailIncludeWaiver defaults false.
 */

/** Not supplied in the Nov 23 strategy draft. Empty so the flag cannot invent a waiver. */
export const CONFIRMATION_WAIVER_PARAGRAPH = "";

export type PlayerConfirmationInput = {
  firstName: string;
  preferredSlot: string;
  email: string;
  friendName?: string | null;
  invitedBy?: string | null;
  gymMember?: GymMember | null;
  signupSrc?: string | null;
  ageBand?: string | null;
};

export function confirmationFirstName(displayName: string | null | undefined): string {
  const name = displayName?.trim() ?? "";
  if (!name || name.includes("@")) return "Recruit";
  return name;
}

function filled(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  return text ? text : null;
}

export function shieldmatePair(input: PlayerConfirmationInput): boolean {
  return Boolean(filled(input.friendName) || filled(input.invitedBy));
}

export function fullSlotSentence(pair: boolean): string {
  if (pair && johnChoices.shieldmateFullSlot === "next-slot-together") {
    return "If your time is full, you and your Shieldmate are offered the next slot together.";
  }
  return "If your time is full, you go on the waitlist for it. Staff will find a Saturday time that works.";
}

export function shieldmateBlock(input: PlayerConfirmationInput): string {
  const friend = filled(input.friendName);
  const invited = filled(input.invitedBy);
  if (friend) {
    return `You're signing up as Shieldmates with ${friend}. Share your invite code from the EMC app. If they join within 14 days, you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.`;
  }
  if (invited) {
    return `You named ${invited} as your Shieldmate. If they join within 14 days with your invite code, you'll be in the same squad, and you each get $20 off your first two months.`;
  }
  return [
    "Bring your Shieldmate. Share your invite code from the EMC app. If your friend joins within 14 days, you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.",
    "",
    "A line you can send them:",
    "I just joined the Empire Mercenary Company. Open my Shieldmate invite in the EMC app within 14 days and we'll each get $20 off our first two months: https://emc.thegiantdungeonmaster.com/shieldmate",
  ].join("\n");
}

export function renderPlayerConfirmation(input: PlayerConfirmationInput): {
  subject: string;
  preheader: string;
  text: string;
} {
  const firstName = input.firstName.trim() || "Recruit";
  const slot = input.preferredSlot.trim() || "the session time you choose";
  const email = input.email.trim();
  const rate = confirmationRateLine(input.gymMember ?? null);
  const writ = gamegridWritLine(input.signupSrc);
  const lines = [
    `${firstName},`,
    "",
    "We've received your seat request for the Empire Mercenary Company.",
    "",
    emailAskedLine(slot),
    ...(input.ageBand === "16_17" ? ["", SATURDAY_TABLE_COPY.waiver16] : []),
    "",
    rate,
    ...(writ ? ["", writ] : []),
    "",
    "Nothing is charged when you ENLIST. Here's what happens next:",
    "",
    `1. Staff will confirm your seat and time slot. ${fullSlotSentence(shieldmatePair(input))}`,
    `2. ${PAYMENT_STEP} Nothing has been charged yet.`,
    `3. You get your invite to the EMC app. Use this same email (${email}). The app signs you in with a link we email you, so there's no password to remember.`,
    "",
    "Depending on your slot, your first session is Saturday, January 2 or Saturday, January 9, 2027. Staff will confirm your date.",
    "",
    "Bring nothing to your first session. Your mini, character sheet, and dice are waiting for you there.",
    "",
    "No D&D experience is needed. A professional Dungeon Master teaches the game as you play.",
    "",
    shieldmateBlock(input),
    "",
    "You start as a recruit. The rest is earned.",
    "The Empire Mercenary Company",
    "",
    "How it works: https://empiremercenarycompany.com/how-it-works",
  ];
  const waiver = johnChoices.confirmationEmailIncludeWaiver ? CONFIRMATION_WAIVER_PARAGRAPH.trim() : "";
  if (waiver) lines.push("", waiver);
  return {
    subject: `We have your enlistment, ${firstName}`,
    preheader: PAYMENT_STEP,
    text: lines.join("\n"),
  };
}
