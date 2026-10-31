/**
 * Pending John's confirmation. From the co-DM and the paper Workout Journal.
 * Turn it off with scoring_config.mental_goal_cmart = false.
 */
export const CMART_CHECKS = [
  { id: "cmart_clear", letter: "C", name: "Clear", prompt: "Say what you will do, in words a squadmate can follow." },
  { id: "cmart_measurable", letter: "M", name: "Measurable", prompt: "Say how you will know it happened." },
  { id: "cmart_attainable", letter: "A", name: "Attainable", prompt: "You can finish it with the days and tools you have." },
  { id: "cmart_relevant", letter: "R", name: "Relevant", prompt: "It feeds Intelligence or Wisdom, or the work in front of you." },
  { id: "cmart_timed", letter: "T", name: "Timed", prompt: "Name the day it is due. An order without a deadline is a wish." },
] as const;

export type CmartId = (typeof CMART_CHECKS)[number]["id"];

export function mentalCategory(category: string): boolean {
  return category === "intelligence" || category === "wisdom";
}

/** Missing config means the pending rule stays on. */
export function cmartRequired(flag: boolean | null | undefined): boolean {
  return flag !== false;
}

export function cmartComplete(flags: Partial<Record<CmartId, boolean>>): boolean {
  return CMART_CHECKS.every((check) => flags[check.id] === true);
}

export function mentalGoalActive(input: {
  category: string;
  required: boolean;
  flags: Partial<Record<CmartId, boolean>>;
}): boolean {
  if (!mentalCategory(input.category) || !input.required) return true;
  return cmartComplete(input.flags);
}
