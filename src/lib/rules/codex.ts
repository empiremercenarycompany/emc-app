import { johnChoices } from "@/config/johnChoices";
import { FAQ_COST_COPY } from "@/lib/rules/public-copy";
import raw from "./codex-terms.json";

export type CodexStatus = "ready" | "confirm" | "john_to_fill";
export type CodexGroup = "dnd" | "gym" | "emc" | "faq";

export type CodexTerm = {
  id: string;
  term: string;
  group: CodexGroup;
  plain: string;
  short?: string;
  inTheGame?: string;
  inRealLife?: string;
  related?: string[];
  status: CodexStatus;
};

const ALIASES: Record<string, string> = {
  trained: "proficiency",
  saves: "saving-throw",
};

const TERMS = raw.terms as CodexTerm[];

export const CODEX_SECTIONS: { id: CodexGroup; label: string }[] = [
  { id: "dnd", label: "D&D Basics" },
  { id: "gym", label: "Gym Basics" },
  { id: "emc", label: "How EMC Works" },
  { id: "faq", label: "FAQ" },
];

/** Three ready entries. Subtitles stay inside confirmed wording. */
export const NEW_HERE: { id: string; title: string; line: string }[] = [
  { id: "abilities", title: "Your six abilities", line: "What the numbers on your sheet mean." },
  { id: "check-in", title: "How a week works", line: "Four questions, due Friday." },
  { id: "set", title: "Gym words, no judgment", line: "Sets, reps, warm-ups and RPE." },
];

export function codexTerm(id: string): CodexTerm | null {
  const key = ALIASES[id] ?? id;
  return TERMS.find((term) => term.id === key) ?? null;
}

/** Ready entries only. A John flag in the body stays hidden even if status was left ready. */
export function isCodexVisible(term: CodexTerm): boolean {
  if (term.status !== "ready") return false;
  const blob = `${term.term}\n${term.plain}\n${term.inTheGame ?? ""}\n${term.inRealLife ?? ""}`;
  if (/\[John to fill\]/i.test(blob) || /\[John to confirm\]/i.test(blob)) return false;
  return true;
}

const EVERY_SATURDAY_FAQ =
  "No. The table is every other Saturday. Workout programming from a coach happens during the week, on your schedule. You pick the Saturday time slot that fits: 9 AM to 12 PM, 2 to 5 PM, or 7 to 10 PM (ages 18 and up).";

/** John's open FAQ choices. Off until the matching flag in johnChoices is flipped. */
export function gatedFaqs(): CodexTerm[] {
  const terms: CodexTerm[] = [];
  if (johnChoices.faqShowCostQuestion) {
    terms.push({
      id: "faq-cost",
      term: "What does it cost?",
      group: "faq",
      plain: FAQ_COST_COPY,
      status: "ready",
    });
  }
  if (johnChoices.faqShowEverySaturday) {
    terms.push({
      id: "faq-every-saturday",
      term: "Is it every Saturday?",
      group: "faq",
      plain: EVERY_SATURDAY_FAQ,
      status: "ready",
    });
  }
  return terms;
}

export function visibleCodex(): CodexTerm[] {
  return TERMS.filter(isCodexVisible).concat(gatedFaqs());
}

export function visibleTerm(id: string): CodexTerm | null {
  const term = codexTerm(id);
  if (!term || !isCodexVisible(term)) return null;
  return term;
}
