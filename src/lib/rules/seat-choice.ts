/**
 * First and second Saturday choice.
 * The waitlist sentence is pending Strategy review.
 */

export const WAITLIST_COPY =
  "Both times you picked are full right now. You're on the waitlist, and you won't pay anything until a seat opens.";

export const SECOND_CHOICE_HINT = "A second time is optional. Pick one if your first choice might be full.";

export const FIRST_FULL_COPY = "Your first choice is full. You can pay for your second choice.";

export type SeatOutcome = "first" | "second" | "waitlist";

export function seatsNeeded(withFriend: boolean): number {
  return withFriend ? 2 : 1;
}

/** first when it has room, otherwise second, otherwise the free waitlist. */
export function chooseSaturdaySeat(input: {
  firstOpen: number;
  secondOpen: number | null;
  withFriend?: boolean;
}): SeatOutcome {
  const need = seatsNeeded(Boolean(input.withFriend));
  if (input.firstOpen >= need) return "first";
  if (input.secondOpen != null && input.secondOpen >= need) return "second";
  return "waitlist";
}

/** After this payment is counted, a negative open means the seat filled underneath them. */
export function slotOversold(openAfterPayment: number): boolean {
  return openAfterPayment < 0;
}

/** `morning:2027-01-02`. Site daytime is the afternoon table. Undated values are not a table. */
export function canonicalSlotKey(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  const [time, date] = trimmed.split(":");
  const slot = time === "daytime" ? "afternoon" : time;
  if (slot !== "morning" && slot !== "afternoon" && slot !== "evening") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return null;
  return `${slot}:${date}`;
}

/** preferred_slot is the first choice. checkout_slot second pays for preferred_slot_2. */
export function soldSlotKey(
  metadata: {
    preferred_slot?: string | null;
    preferred_slot_2?: string | null;
    checkout_slot?: string | null;
  } | null | undefined,
): string | null {
  if (!metadata) return null;
  const raw = metadata.checkout_slot === "second" ? metadata.preferred_slot_2 : metadata.preferred_slot;
  return canonicalSlotKey(raw);
}
