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

export const GLOSSARY: Record<GlossaryId, { term: string; plain: string }> = {
  ac: { term: "AC", plain: "Armor Class. How hard you are to hit." },
  hp: { term: "HP", plain: "How much harm you can take before you drop." },
  initiative: { term: "Initiative", plain: "Who acts first when a fight starts." },
  saves: { term: "Saves", plain: "A roll to resist harm or a sudden effect." },
  advantage: { term: "Advantage", plain: "Roll two dice and keep the better one." },
  d20: { term: "d20", plain: "A twenty-sided die. Most checks use it." },
  modifier: { term: "Modifier", plain: "The number you add to a die. It comes from an ability." },
  cardio: { term: "Cardio", plain: "Steady work that raises your heart rate." },
  set: { term: "Set", plain: "One group of repetitions." },
  rep: { term: "Rep", plain: "One full movement." },
  trained: { term: "Trained", plain: "Your background already teaches this. You do not pick it." },
  feat: { term: "Feat", plain: "A small talent that comes with the background." },
};
