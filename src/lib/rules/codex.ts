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

export function visibleCodex(): CodexTerm[] {
  return TERMS.filter(isCodexVisible);
}

export function visibleTerm(id: string): CodexTerm | null {
  const term = codexTerm(id);
  if (!term || !isCodexVisible(term)) return null;
  return term;
}
