import { TOUR_STOPS, type TourStop } from "@/content/tour";

/** Per browser, per account. No server column. */
export function tourSeenKey(userId: string): string {
  return `emc-tour-seen:${userId}`;
}

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function hasSeenTour(store: KeyValueStore, userId: string): boolean {
  try {
    return store.getItem(tourSeenKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(store: KeyValueStore, userId: string): void {
  try {
    store.setItem(tourSeenKey(userId), "1");
  } catch {
    /* private mode still closes the walk for this visit */
  }
}

/**
 * First signed-in visit to the Barracks. Replay ignores this and opens anyway.
 * A signed-out browser never auto-starts.
 */
export function shouldAutoStart(input: { userId: string | null; pathname: string; seen: boolean }): boolean {
  if (!input.userId) return false;
  if (input.pathname !== "/") return false;
  return !input.seen;
}

/** Replay is available whenever the Menu or Profile entry is used, seen or not. */
export function shouldOpenTour(input: {
  userId: string | null;
  pathname: string;
  seen: boolean;
  replay: boolean;
}): boolean {
  if (input.replay) return true;
  return shouldAutoStart(input);
}

const BLOCKED_PREFIXES = ["/dm", "/muster", "/trainer", "/notes", "/preview", "/sign-in", "/auth", "/api"] as const;

/** Staff screens, the table, dev login, and preview routes are never a stop. */
export function isBlockedTourRoute(route: string): boolean {
  const path = route.split(/[?#]/)[0] ?? route;
  return BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Drop a stop the player cannot use.
 * Long-term goals toward level 4 open at level 3. They are not their own stop.
 * The Goals stop stays, and its line already says those tools show up later.
 * A stop that sets minLevel is omitted until the character reaches it.
 */
export function visibleStops(stops: readonly TourStop[], player: { level: number | null }): TourStop[] {
  return stops.filter((stop) => {
    if (isBlockedTourRoute(stop.route)) return false;
    if (stop.minLevel != null && (player.level == null || player.level < stop.minLevel)) return false;
    return true;
  });
}

export function playerStops(level: number | null): TourStop[] {
  return visibleStops(TOUR_STOPS, { level });
}

/** True when the address bar already shows the stop, including its query. */
export function samePlace(pathname: string, query: string, route: string): boolean {
  const bare = route.split("#")[0] ?? route;
  const qmark = bare.indexOf("?");
  const path = qmark >= 0 ? bare.slice(0, qmark) : bare;
  const want = new URLSearchParams(qmark >= 0 ? bare.slice(qmark + 1) : "");
  if (pathname !== path) return false;
  const have = new URLSearchParams(query);
  if (want.size !== have.size) return false;
  for (const [key, value] of want) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

export function scrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}
