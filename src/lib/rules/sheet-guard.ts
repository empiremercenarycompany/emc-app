/** Mobile fires click after touchend. A sheet that closes on that tap must ignore the next open. */
export const GHOST_CLICK_MS = 500;

export function sheetOpenBlocked(closedAt: number | null, now: number, windowMs = GHOST_CLICK_MS): boolean {
  if (closedAt == null) return false;
  return now - closedAt < windowMs;
}
