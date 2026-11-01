import { formatMuster } from "./dates";

export type AdventureRow = {
  title: string | null;
  start_date: string | null;
  status?: string | null;
  number?: number | null;
};

/**
 * Lowest-numbered upcoming or active adventure that already has a start date.
 * The spoken day is the cohort anchor. Closed rows and undated active rows are skipped.
 */
export function cohortAdventure(rows: AdventureRow[], cohortStart: string | null): { title: string; start: string } | null {
  const start = (cohortStart ?? "").slice(0, 10);
  if (start.length !== 10) return null;
  const chosen = rows
    .filter((row) => (row.title ?? "").trim().length > 0)
    .filter((row) => row.status === "upcoming" || row.status === "active")
    .filter((row) => (row.start_date ?? "").slice(0, 10).length === 10)
    .sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER))[0];
  if (!chosen?.title) return null;
  return { title: chosen.title.trim(), start };
}

/** Adventure 3 begins Saturday, Jan 2 */
export function cohortBeginsLine(title: string, start: string): string {
  return `${title.trim()} begins ${formatMuster(start.slice(0, 10))}`;
}

export function embeddedTitle(value: { title?: string | null } | { title?: string | null }[] | null | undefined): string | null {
  if (!value) return null;
  const one = Array.isArray(value) ? value[0] : value;
  const title = one?.title?.trim();
  return title ? title : null;
}

/** Show the adventure name once, then the table title and the spoken date. */
export function postedSessionLine(input: { title: string; adventureTitle: string | null; sessionDate: string | null }): string {
  const title = input.title.trim();
  const adventure = input.adventureTitle?.trim() ?? "";
  const named = adventure && !title.toLowerCase().includes(adventure.toLowerCase()) ? `${adventure} · ${title}` : title;
  const day = (input.sessionDate ?? "").slice(0, 10);
  if (day.length !== 10) return named;
  const spoken = formatMuster(day);
  if (named.includes(spoken)) return named;
  return `${named} · ${spoken}`;
}
