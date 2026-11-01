/** Split a recorded attack only when it already contains a damage roll. Names stay whole. */
export function attackParts(line: string): { name: string; bonus: string | null; damage: string | null } {
  const match = /\b(\d+d\d+(?:[+-]\d+)?)\b/i.exec(line);
  if (!match || match.index == null) return { name: line.trim(), bonus: null, damage: null };
  const damage = match[1] ?? null;
  const before = line.slice(0, match.index).trim();
  const bonusMatch = /^(.*)\s([+-]\d+)$/.exec(before);
  if (bonusMatch?.[1]) return { name: bonusMatch[1].trim(), bonus: bonusMatch[2] ?? null, damage };
  return { name: before || line.trim(), bonus: null, damage };
}
