export type ParsedDice = {
  count: number;
  sides: number;
  modifier: number;
};

export type DiceRoll = {
  expression: string;
  rolls: number[];
  otherRolls: number[] | null;
  kept: number[];
  modifier: number;
  total: number;
  mode: "normal" | "advantage" | "disadvantage";
};

const EXPRESSION = /^(\d*)d(\d+)([+-]\d+)?$/i;

export function parseDice(input: string): ParsedDice | null {
  const match = EXPRESSION.exec(input.trim().replace(/\s+/g, ""));
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;
  if (!Number.isInteger(count) || !Number.isInteger(sides) || !Number.isInteger(modifier)) return null;
  if (count < 1 || count > 40 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}

function cryptoUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 4294967296;
}

function rollPool(parsed: ParsedDice, rng: () => number): number[] {
  return Array.from({ length: parsed.count }, () => 1 + Math.floor(rng() * parsed.sides));
}

function totalOf(rolls: number[], modifier: number): number {
  return rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
}

/**
 * Parses `NdX+M`. Advantage and disadvantage each roll the pool twice and
 * keep the higher or lower total. Asking for both cancels to a normal roll.
 */
export function rollDice(
  input: string,
  options: { advantage?: boolean; disadvantage?: boolean; rng?: () => number } = {},
): DiceRoll {
  const parsed = parseDice(input);
  if (!parsed) throw new Error("Could not read that dice expression. Use NdX+M, such as 1d20+3.");
  const rng = options.rng ?? cryptoUnit;
  const advantage = Boolean(options.advantage);
  const disadvantage = Boolean(options.disadvantage);
  const mode: DiceRoll["mode"] =
    advantage === disadvantage ? "normal" : advantage ? "advantage" : "disadvantage";

  const first = rollPool(parsed, rng);
  if (mode === "normal") {
    return {
      expression: input.trim(),
      rolls: first,
      otherRolls: null,
      kept: first,
      modifier: parsed.modifier,
      total: totalOf(first, parsed.modifier),
      mode,
    };
  }
  const second = rollPool(parsed, rng);
  const firstTotal = totalOf(first, parsed.modifier);
  const secondTotal = totalOf(second, parsed.modifier);
  const keepFirst = mode === "advantage" ? firstTotal >= secondTotal : firstTotal <= secondTotal;
  const kept = keepFirst ? first : second;
  return {
    expression: input.trim(),
    rolls: first,
    otherRolls: second,
    kept,
    modifier: parsed.modifier,
    total: keepFirst ? firstTotal : secondTotal,
    mode,
  };
}

export function checkExpression(modifier: number): string {
  if (modifier === 0) return "1d20";
  return modifier > 0 ? `1d20+${modifier}` : `1d20${modifier}`;
}
