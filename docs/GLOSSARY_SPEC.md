# Story glossary

Design only. No screens, tables, or pictures are built by this document. The app still invents no story.

John's idea, in his words: a story glossary with people, factions, a map, and other important things, so players can look things up in the game or out of it, with pictures. Players can add their own private notes on a person or faction, and there is a place showing that a player holds a chit with that person or faction. For John only: each person's personality, voice, looks, and previous encounters. Later, those people can be talked to inside the app.

This note says what to store, who can see it, and when to build it. The story words themselves come from Sage (what is true in the world) and Cleric (how magic works), and only after a canon review.

## What a player would see

A player opens one book. They can search. They see only what the story has already shown their company, their squad, or them. A page can have a picture, a short description, and links to related pages. If they hold a chit with a person or a faction, the page says so. They can write a private note that is theirs alone.

They never see the DM's private notes: personality, voice, looks, old encounters that have not been played out, or secrets.

The book is not the Company Codex. The Codex is the plain-language booklet already in the app: what a word means at the table and in the gym (hit points, a set, a check-in). It is a file in the app, not a story the DM edits each week. The roadmap already lists a later lore wiki and says not to invent entries there.

**Recommendation: build a new story glossary. Do not fold people and factions into the Codex.**

Keep the Codex for rules and gym words. Link a glossary page to a Codex word only when the player needs the rules meaning (for example, a magic word that Cleric has defined). People, factions, places, maps, and objects do not belong in that booklet. They need pictures, unlocks, private notes, and a DM-only side. The Codex cannot do that without turning a simple word list into a second game.

A player note they already write on the character sheet (`character_npcs`: a name, a relationship, a likeness, sent to a lore approver) stays that feature. It is a note the player submits about someone they met. It is not the company's glossary, and staff can already read it. Private glossary notes, below, are a different thing.

## 1. Kinds of pages

Six kinds. Every page shares the same front. Each kind adds a few fields of its own.

Shared front, once the page is allowed to be seen:

- Name
- Kind (person, faction, place, map, object, or lore word)
- One-line summary
- Picture, if one has been cleared for players
- Related pages
- Who wrote the source (Sage or Cleric) and that it passed canon review

Kind-specific, still only the player-facing part:

| Kind | Extra fields the player can eventually see |
| --- | --- |
| Person (NPC) | What they are to the company, in a sentence. Other names, once those names have been said at the table. |
| Faction | What the group is, in a sentence. |
| Place | Which larger place it sits in, if that has been shown. A pin on a map, once the map is shown. |
| Map | The picture of the map, and the pins that are already unlocked. |
| Object | A short description. Who is said to hold it, only if that has been shown. |
| Lore word | A short meaning, in Sage's or Cleric's words, plus links. |

Nothing in that list is personality, voice, a secret, or a script for later play. Those live in the DM-only file in section 3.

### For the build

One table, `glossary_entries`, holds the shared front and a `kind`. Kind-specific player fields can be columns that stay empty for the other kinds, or a small side table per kind. Prefer columns for the short list above so a page is one read. Do not put DM-only text in this table.

Suggested columns: `id`, `guild_id`, `kind`, `name`, `summary`, `player_image_id`, `parent_entry_id` (a place inside a place, or a pin's map), `source` (`sage` or `cleric`), `review_status` (`draft`, `in_review`, `published`), `example` (true only for labeled sample rows), `created_by`, `updated_at`.

Publishing a row requires `is_lore_approver()` (the existing `can_approve_lore` flag on a staff role). A DM may draft. A draft is invisible to players even if a reveal exists.

## 2. Pictures

Pictures can come from three places:

- The DM uploads a file into the app, which stores it in Supabase Storage.
- An export from Canva (a PNG or WebP saved to the computer, then uploaded the same way).
- Commissioned art, uploaded the same way. The file in storage is a web-sized copy, not the print master.

The free Supabase plan includes a limited storage allotment (on the order of 1 GB for the whole project, shared with portraits and other files). Treat that as a budget, not a dump.

Recommended limits, so one art drop cannot fill the project:

- WebP or JPEG for photos and paintings. PNG only when the picture needs a hard edge.
- Longest side 1600 pixels.
- About 1.5 MB per file.
- The DM's private copy and the player's copy are separate files. Publishing never flips a private file to public in place.

Buckets that exist today (`character-portraits`, `guild-banners`, `achievement-icons`) are world-readable. Session attachments are private to company members, but they are not a picture library. Do not put glossary art in a public bucket. A public URL cannot be "unlocked later."

### For the build

New private bucket `glossary-art` (`public = false`). Paths:

- `{guild_id}/dm/{image_id}` — DM-only. Select and write if `is_dm()` and `is_member(guild_id)`.
- `{guild_id}/player/{image_id}` — may be shown to players, and only after a reveal says that image is visible to that player (section 6).

Example storage policies:

```sql
create policy glossary_art_dm_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'glossary-art'
    and (storage.foldername(name))[2] = 'dm'
    and public.is_dm()
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy glossary_art_dm_write
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'glossary-art'
    and (storage.foldername(name))[2] = 'dm'
    and public.is_dm()
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );
```

Player reads should not be a blanket "any member can read `player/`". A security-definer function checks the reveal, then returns a short-lived signed URL. If that is too heavy for the first slice, the player path can be readable by guild members only after the image row is marked `cleared`, and uncleared art stays under `dm/`. DM-only pictures never get a player URL.

## 3. What players see, and what stays with the DM

Player-facing pages are section 1. The DM file is separate. It is not a set of hidden columns on the same row. Hidden columns are easy to leak through a view, a log, or a later chat tool that selects `*`.

The DM file, one row per person (and later per faction if John wants the same treatment), holds:

- Personality
- Voice
- Looks
- Previous encounters (the DM's record, not the player's memory)
- Secrets

John described this file as for him. In the app, the DM role is `is_dm()`. Lore approval is a different switch, `can_approve_lore`, and it is not the same as being a DM. The test roster leaves the DM's lore flag off and turns it on for the curator. So: drafting and reading the DM file follows `is_dm()`. Putting anything on a player page follows `is_lore_approver()`.

### For the build

Table `glossary_dossiers`: `entry_id` primary key, references `glossary_entries`, plus the five text fields above. No player policy at all.

```sql
alter table public.glossary_dossiers enable row level security;

create policy glossary_dossiers_dm
  on public.glossary_dossiers
  for all to authenticated
  using (
    public.is_dm()
    and exists (
      select 1 from public.glossary_entries e
      where e.id = entry_id
        and public.is_member(e.guild_id)
    )
  )
  with check (
    public.is_dm()
    and exists (
      select 1 from public.glossary_entries e
      where e.id = entry_id
        and public.is_member(e.guild_id)
    )
  );
```

There is no `select` policy for other roles. A player, a trainer, and a curator without the DM role get zero rows. Do not also store these fields on `glossary_entries`.

Whether every DM in the company should see John's voice notes, or only one account, is an open question at the end. The policy above is the recommended default: the DM role, same company, not every staff role.

## 4. A player's private notes

A player may write a note on a person or a faction they can already see. It is a memory aid. It is not canon, and it is not submitted for approval.

Recommended default: only that player can read or edit the note. The DM does not see it unless John later says so. This is the opposite of `character_npcs`, which staff can read. Keep both. Do not reuse `character_npcs` for private notes, or the DM will see notes the player thought were private.

**John decides** whether a DM can read these notes. The spec ships with "no" until he says otherwise.

### For the build

Table `glossary_player_notes`: `id`, `entry_id`, `character_id`, `body` (a few thousand characters at most), `updated_at`. Unique on (`entry_id`, `character_id`).

```sql
create policy glossary_notes_owner
  on public.glossary_player_notes
  for all to authenticated
  using (public.owns_character(character_id))
  with check (
    public.owns_character(character_id)
    and exists (
      select 1 from public.glossary_entries e
      join public.characters c on c.id = character_id
      where e.id = entry_id
        and e.guild_id = c.guild_id
        and e.review_status = 'published'
    )
  );
```

No staff policy. A DM running SQL as themselves still cannot read the table. (A database owner always can. That is the hosting account, not the DM screen.)

## 5. Chits

John, Nov 1, 2026: the player-facing name is **chit**. If a player holds a chit for an entry, that chit shows on the glossary entry.

A chit is something a player holds with one person or one faction. It is not a score, not a week count, and not a rank. The entry itself is where they see it. On screen: "You hold a chit with [name]." Do not call it Standing, Clearance, rank, or a mark.

**Granting.** Only a DM or other staff (`is_staff()`, which is already the DM, admin, and curator grant roles). A player cannot give themselves a chit. Each grant records who did it, when, and why, and the table session if it happened at the table.

**Spending and revoking.** Recommended: a chit stays until staff mark it spent or revoked, with a reason. Players do not spend it from the phone. That keeps the story in the room. John can later allow a player to mark a chit spent if the table wants that.

### For the build

Table `glossary_chits`: `id`, `character_id`, `entry_id`, `status` (`held`, `spent`, `revoked`), `granted_by`, `granted_at`, `reason`, `session_id`.

Table `glossary_chit_events` is append-only: `chit_id`, `action` (`granted`, `spent`, `revoked`), `actor_id`, `at`, `reason`, `session_id`. Updates to a chit insert an event in the same function. Players can read their own chits. They cannot insert. Staff in the same company can insert and update through one function, not through open table writes.

```sql
create policy glossary_chits_read_own
  on public.glossary_chits
  for select to authenticated
  using (public.owns_character(character_id));
```

### Names, and the clash Sage flagged

The repo has no word "Standing", no reputation score, and no chit. Searches for those words in the app and the database scripts find nothing.

What does exist, and must stay separate:

- **Clearance** is a civic honor from weeks in the company: Known, Trusted, Vouched For, Honoured, Esteemed of Bleakspire, then Pillar of Bleakspire. It is on the check-in screen. What each honor unlocks is still empty. Depth tiers (60, 70, 80, 90, 100) are a different ladder and also unnamed. The spelling is Honoured.
- **Clearance mark** in the Discord formatter is the weekly check-in score out of 2. It is not a relationship with a person.
- **Ranks** (Recruit, Sergeant, Captain) are still placeholders. They are not story tokens.
- **Buffs** are temporary table awards (heroic inspiration, and so on). They are not held with a faction.

"Standing" would sit too close to Clearance. "Known" and "Trusted" are already Clearance names. A player who "has standing" with a faction will sound like they earned a civic honor. That name is not used.

### Other names John set the same day

These are not glossary entries. They are recorded here so the story book does not drift from the rest of the app.

- Player-facing species names are **Seraph** and **Inferni**. The stored ids stay `aasimar` and `tiefling`. Sage owns the exact sentences around those names.
- The Clearance honor at week 36 is spelled **Honoured**.
- **Orc** and **Ork** are two different things in canon. Nothing in the app may merge them, alias one to the other, or autocorrect one into the other.

## 6. Unlocking

A published page is still hidden until someone reveals it. Reveals can be:

- The whole company
- One squad
- One player

The DM chooses the scope, can attach the table session where it happened, and can reveal a whole page or one field (the name first, the picture later, the summary after the scene).

Taking a reveal back is allowed, and it is also logged. Hiding something that was already said at the table should be rare. The log keeps both.

Players see a page when all of these are true: it is published, it is not example data, and a reveal covers their company, their squad, or their character. They see a field only if that field has been revealed, or the reveal was for the whole page.

### For the build

`glossary_reveals`: `id`, `entry_id`, `field` (null means the whole page), `scope` (`guild`, `squad`, `character`), `squad_id`, `character_id`, `session_id`, `revealed_by`, `revealed_at`, `hidden_at`, `note`.

Inserts are `is_dm()` in that company. The table is the log. Do not update a row to erase history. Hiding sets `hidden_at` and inserts nothing over the original `revealed_at`. Players have a select policy that matches scope to their membership or character, and ignores rows with `hidden_at` set. Staff read the full log.

`session_id` references `sessions`, the same table Schedule and Muster already use.

## 7. Talking to a person later (v2 only)

Not built. No chat service, no model, no bill. This section is what to store now so a later conversation can stay inside the story and cannot quote the DM file.

Store now, as ordinary text:

- Voice notes on the DM file (how they speak). The player-facing page does not include them until John publishes a line on purpose.
- Knowledge boundaries on the DM file: topics this person will speak about, topics they will not, and what they do not know.
- Encounters: a row per person, per player, per session, with a short "what was said" that is either player-visible or DM-only. DM-only encounter text lives in the dossier side, not on the player row.
- Chits, so a later conversation knows the player holds one.

A future chat may read: the published page, the player's own notes if John allows that, player-visible encounters, and chits the player holds. It may read voice notes only if those notes are copied into a player-safe "voice card" at publish time. It must not read `glossary_dossiers`. The safe way is a database role or a view with no path to that table, not a prompt that says "please ignore secrets."

Officer chat on the roadmap (personas for speeches, nutrition, and workouts) is a different feature. Do not reuse those sheets as glossary people. They are player characters in the test roster, not this book.

## 8. Where the words come from

Sage writes lore. Cleric writes how magic works. A page stays a draft until canon review. The app does not fill in a description, a name, or a map label to look finished.

`can_approve_lore` is that review switch. It already exists. An admin sets it in SQL. The approver cannot approve their own player NPC note today. The same rule should hold for glossary pages: the person who drafts is not the person who publishes, unless John is the only person in both seats and he says so.

Any sample row used to try the screen must have `example` true and a name like "Example person" or "Example faction". Do not use real Toten names. Do not use the test-roster officers as if they were glossary entries. Do not describe Bleakspire beyond the one line already allowed: a fortress with a small city around it.

## 9. Where this sits in the rollout

The order already in front of the company is: Garet's prototype (the live app he is testing), then player previews, then the public site, the DM dashboard, and engagement tracking.

The glossary is not part of Garet's prototype. That test is sign-up, the sheet, goals, and the journal. A story book does not help that test, and it would need Sage's words before it is honest.

| Phase | What the player gets | Size | Why this order |
| --- | --- | --- | --- |
| Not in the prototype | Nothing | — | Garet's loop does not need it. |
| Read-only book with unlocks | Search, pictures that are cleared, pages the DM has revealed. No notes, no chits, no chat. | Small: the entry table, the reveal log, the private art bucket, one screen. | A reasonable candidate for the January 2 adventure (Adventure 3), and only if Sage has a handful of reviewed pages ready. Looking someone up at the table is the first real use. |
| Notes and chits | Private notes, and the chit shown on the glossary entry when the player holds one. Staff grant and revoke. | Medium: two more tables, policies, and a small staff control. | After players have used the book once. Chits change the table. They should not ship in the same week as the first pages. |
| Talking to a person | v2. Uses the voice card, encounters, and chits. Still no path to the DM file. | Large, and not this app's next build. | The roadmap already puts officer chat later. Interactive people wait until the boundaries exist. |

January 2 is a candidate, not a promise. If the reviewed pages are not ready, skip it rather than publish example people.

## 10. Open questions for John

1. Is the DM role allowed to read every dossier, or only your account?
2. May a DM read a player's private glossary notes? This spec says no until you say otherwise.
3. Can a chit be spent or only revoked by staff? Should a player ever mark one spent?
4. Does a chit exist for places and objects, or only for people and factions?
5. For January 2, do you want a read-only book at all, and will Sage have reviewed pages by then?
6. Who publishes: only `can_approve_lore`, and may the drafter also be the approver when that is you?
7. Should a revealed page ever be hidden again after it was said at the table?
8. Do factions get the same DM file (personality is a poor fit; secrets and voice might), or only people?
9. May a later chat read the player's private notes, or only canon pages, encounters, and chits?
10. Where should commissioned masters live (not in the app's storage)?
11. Do you want the story book as its own destination, or a section reached from the Codex screen without mixing the two kinds of entries?
