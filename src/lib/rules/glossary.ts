import { visibleTerm } from "./codex";

export type GlossaryId =
  | "ac"
  | "hp"
  | "initiative"
  | "saves"
  | "advantage"
  | "d20"
  | "modifier"
  | "cardio"
  | "set"
  | "rep"
  | "trained"
  | "feat";

function entry(id: GlossaryId): { term: string; plain: string } {
  const term = visibleTerm(id);
  return { term: term?.short ?? term?.term ?? id, plain: term?.plain ?? "" };
}

/** Visible Codex rows. Hidden entries are not copied here. */
export const GLOSSARY: Record<GlossaryId, { term: string; plain: string }> = {
  ac: entry("ac"),
  hp: entry("hp"),
  initiative: entry("initiative"),
  saves: entry("saves"),
  advantage: entry("advantage"),
  d20: entry("d20"),
  modifier: entry("modifier"),
  cardio: entry("cardio"),
  set: entry("set"),
  rep: entry("rep"),
  trained: { term: "Trained", plain: entry("trained").plain },
  feat: entry("feat"),
};
