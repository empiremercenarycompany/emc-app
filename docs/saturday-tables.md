# Saturday tables

The app picker is on `/schedule` and `/intake`. The public site `/signup` dropdown is unchanged.

## Slot ids

The app stores three ids on `session_timeslots`: `morning`, `afternoon`, and `evening`.

The public site uses `daytime` for the 2 to 5 PM block. `public.normalize_timeslot_id` and `normalizeTimeslotId` accept `daytime` and store `afternoon`. `daytime` is not inserted as its own slot. Saving one person's table does not rewrite anyone else's row.

## Seats

A seat counts only when a character is already assigned to the squad on that table. A request is not a seat. An empty table shows 6 of 6 seats left. A table with six placed characters shows Full and stays on the hall, with the waitlist.

Squad names come from `squads.name` and only for a signed-in reader. A placed squad with no name shows Squad forming. The public board function returns the placed count and hides the name and the squad id.

## Shieldmate window

The pair line says 14 days. That is the rule already used in the app: the character-sheet Shieldmate copy, the player confirmation, and both auth email templates (`supabase/templates/confirm-signup.html` and `supabase/templates/invite.html`). No table or function stores a different number of days. The 14-day goal backfill is a separate rule and is not the Shieldmate window.

Ask staff opens `mailto:empiremercenarycompany@gmail.com` with the subject `Shieldmate seats` and the table label as the body. There is no new message system.
