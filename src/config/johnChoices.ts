/**
 * John's open choices. Change one value to flip that answer.
 * Defaults match the live site and app as of November 23, 2026.
 */
export const johnChoices: {
  /** Live terms waitlist the chosen slot. "next-slot-together" offers a Shieldmate pair the next slot. */
  shieldmateFullSlot: "waitlist" | "next-slot-together";
  /** The Nov 13 waiver paragraph stays out of the player confirmation email. */
  confirmationEmailIncludeWaiver: boolean;
  /** Effective date on the live terms page. The app redirects there and does not host a second copy. */
  termsEffectiveDate: string;
  /** Codex question "What does it cost?" stays hidden until John wants it. */
  faqShowCostQuestion: boolean;
  /** The $120 sentence in that cost answer stays hidden until John confirms it. */
  faqShow120: boolean;
  /** Codex question "Is it every Saturday?" stays hidden until John wants it. */
  faqShowEverySaturday: boolean;
} = {
  shieldmateFullSlot: "waitlist",
  confirmationEmailIncludeWaiver: false,
  termsEffectiveDate: "November 12, 2026",
  faqShowCostQuestion: false,
  faqShow120: false,
  faqShowEverySaturday: false,
};
