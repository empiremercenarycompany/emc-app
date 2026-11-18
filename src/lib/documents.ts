import type { DocumentSeal } from "./seals/types";

export type DocumentKind = "notice" | "order" | "contract" | "letter" | "briefing";

export type InWorldDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  paragraphs: string[];
  signature: { signerId: string; name: string };
  seal: DocumentSeal;
};

export const KIND_LABEL: Record<DocumentKind, string> = {
  notice: "Notice",
  order: "Order",
  contract: "Contract",
  letter: "Letter",
  briefing: "Briefing",
};

/**
 * Signed papers the app can show.
 * There is no order, contract, briefing, or tour sign-off in the app.
 * The page motto is a company line, not a person's signature.
 * This notice repeats lines the Company already uses, and Valthar Brightlance signs it.
 * Recruitment review is the other signed paper: the recruit signs, and the Company seal is the company's own press.
 */
export const COMPANY_DOCUMENTS: readonly InWorldDocument[] = [
  {
    id: "company-notice",
    kind: "notice",
    title: "From the Company",
    paragraphs: [
      "A squad, a story, and a reason to keep showing up.",
      "Train. Record. Advance.",
      "Your week shapes your character and the story.",
      "Go forth and conquer.",
    ],
    signature: { signerId: "valthar", name: "Valthar Brightlance" },
    seal: { factionId: "company", makerId: "valthar" },
  },
];
