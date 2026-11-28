import { TIMESLOT_FALLBACK } from "@/lib/rules/intake";

/** No-login path the marketing site calls. */
export const PUBLIC_AVAILABILITY_PATH = "/api/availability";

export const PUBLIC_AVAILABILITY_MAX_AGE = 30;

export type PublicSlotId = "morning" | "afternoon" | "evening";

export type PublicSlot = {
  open: boolean;
  label: string;
  seats_open: number;
};

export type PublicAvailability = {
  slots: Record<PublicSlotId, PublicSlot>;
};

const LABELS: Record<PublicSlotId, string> = {
  morning: TIMESLOT_FALLBACK[0].label,
  afternoon: TIMESLOT_FALLBACK[1].label,
  evening: TIMESLOT_FALLBACK[2].label,
};

const SITE_ORIGIN = "https://empiremercenarycompany.com";
const PREVIEW_HOST = /^(?:[a-z0-9-]+-)?empiremercenarycompany-7134\.vercel\.app$/;

export function emptyPublicAvailability(): PublicAvailability {
  return {
    slots: {
      morning: { open: false, label: LABELS.morning, seats_open: 0 },
      afternoon: { open: false, label: LABELS.afternoon, seats_open: 0 },
      evening: { open: false, label: LABELS.evening, seats_open: 0 },
    },
  };
}

/**
 * One entry per site preferred_slot. seats_open is the sum of open seats
 * on both Saturday dates for that time. No names and no squads.
 */
export function publicAvailabilityFromRows(
  rows: { timeslot_id?: string; open?: number }[],
): PublicAvailability {
  const seats: Record<PublicSlotId, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const row of rows) {
    const raw = (row.timeslot_id ?? "").trim().toLowerCase();
    const id = raw === "daytime" ? "afternoon" : raw;
    if (id !== "morning" && id !== "afternoon" && id !== "evening") continue;
    const open = Number(row.open);
    if (!Number.isFinite(open) || open <= 0) continue;
    seats[id] += Math.floor(open);
  }
  return {
    slots: {
      morning: { open: seats.morning > 0, label: LABELS.morning, seats_open: seats.morning },
      afternoon: { open: seats.afternoon > 0, label: LABELS.afternoon, seats_open: seats.afternoon },
      evening: { open: seats.evening > 0, label: LABELS.evening, seats_open: seats.evening },
    },
  };
}

/** Reflect only the company site and that team's Vercel previews. */
export function publicAvailabilityOrigin(origin: string | null): string | null {
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (host === "empiremercenarycompany.com") return SITE_ORIGIN;
  if (PREVIEW_HOST.test(host)) return `https://${host}`;
  return null;
}

export function publicAvailabilityHeaders(origin: string | null, cache: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Cache-Control": cache ? `public, max-age=${PUBLIC_AVAILABILITY_MAX_AGE}, s-maxage=${PUBLIC_AVAILABILITY_MAX_AGE}` : "no-store",
  };
  if (cache) headers["Vercel-CDN-Cache-Control"] = `public, s-maxage=${PUBLIC_AVAILABILITY_MAX_AGE}`;
  const allowed = publicAvailabilityOrigin(origin);
  if (!allowed) return headers;
  headers["Access-Control-Allow-Origin"] = allowed;
  headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
  headers["Access-Control-Max-Age"] = "600";
  return headers;
}
