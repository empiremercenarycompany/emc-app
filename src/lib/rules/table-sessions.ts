export type TableSessionRow = {
  session_date: string | null;
  squad_id: string | null;
  off_week?: boolean | null;
};

/** Earliest posted table row on or after today. Guild-wide rows count, plus the viewer's own squad. */
export function nextPostedSession<T extends TableSessionRow>(rows: T[], today: string, squadId: string | null): T | null {
  const day = today.slice(0, 10);
  const upcoming = rows
    .filter((row) => row.off_week !== true)
    .filter((row) => row.squad_id == null || (squadId != null && row.squad_id === squadId))
    .map((row) => ({ row, date: (row.session_date ?? "").slice(0, 10) }))
    .filter((item) => item.date.length === 10 && item.date >= day)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0]?.row ?? null;
}

/** Earliest posted table date on or after today. */
export function earliestTableSession(rows: TableSessionRow[], today: string, squadId: string | null): string | null {
  const row = nextPostedSession(rows, today, squadId);
  const date = (row?.session_date ?? "").slice(0, 10);
  return date.length === 10 ? date : null;
}

/** The per-session attendance button is only for that session's company date. */
export function attendanceOpen(sessionDate: string | null | undefined, today: string | null | undefined): boolean {
  const sessionDay = (sessionDate ?? "").slice(0, 10);
  const companyDay = (today ?? "").slice(0, 10);
  return sessionDay.length === 10 && sessionDay === companyDay;
}
