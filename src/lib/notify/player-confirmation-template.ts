import { johnChoices } from "@/config/johnChoices";

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
  return "If your time is full, you go on the waitlist for it with today's rate locked in.";
}

export function shieldmateBlock(input: PlayerConfirmationInput): string {
  const friend = filled(input.friendName);
  const invited = filled(input.invitedBy);
  if (friend) {
    return `You're signing up as Shieldmates with ${friend}. If they enlist within 14 days, pick your session time, and put your name under "Who invited you?", you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.`;
  }
  if (invited) {
    return `You listed ${invited} under "Who invited you?" If they enlisted within 14 days and you picked the same session time, you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.`;
  }
  return [
    "Bring your Shieldmate. If a friend enlists within 14 days, picks your session time and puts your name under 'Who invited you?', you'll be in the same squad, you each get $20 off your first two months, and you both start proficient in something you grew up doing together.",
    "",
    "A line you can send them:",
    "I just joined the Empire Mercenary Company. Enlist in the next 14 days, pick my session time, put my name under 'Who invited you?', and we'll be in the same squad with $20 off our first two months each: empiremercenarycompany.com/signup?src=friend",
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
  const lines = [
    `${firstName},`,
    "",
    "We've received your seat request for the Empire Mercenary Company.",
    "",
    `You asked for: ${slot}, every other Saturday, at Empire Strength and Fitness, 1539 E Piper St, Idaho Falls. Your squad is set by the session time you choose. The Company is for ages 16 and up. The 7 to 10 PM slot is for ages 18 and up.`,
    "",
    "Nothing is charged when you ENLIST. Here's what happens next:",
    "",
    `1. Staff will confirm your seat and time slot. ${fullSlotSentence(shieldmatePair(input))}`,
    "2. Once your seat is confirmed, staff send you a payment link through EMC's Stripe. Nothing has been charged yet.",
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
    preheader: "Nothing is charged yet. Staff will confirm your seat and send a payment link.",
    text: lines.join("\n"),
  };
}
