/** Character name, then a real display name. Never the raw mailbox name. */
export function recruitName(input: {
  characterName?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const character = clean(input.characterName);
  if (character) return character;
  const display = clean(input.displayName);
  if (display && !isMailboxName(display, input.email)) return display;
  return "Recruit";
}

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function isMailboxName(name: string, email: string | null | undefined): boolean {
  if (name.includes("@")) return true;
  const local = (email ?? "").split("@")[0]?.trim().toLowerCase();
  if (!local) return false;
  return name.toLowerCase() === local;
}
