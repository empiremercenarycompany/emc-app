# Open questions

John has the final say. Decided lines record the 10/28 lock. Open lines are still config.

## Decided 10/28

- The 27 is a standard point buy. Scores stop at 15. The starting +2/+1 or three +1s are a background bonus and do not consume the 27. There is no further lifetime cap.
- Weekly cap is 4 earned, and 2 from any one pool. Attendance (2, any ability) is outside the cap. Weeks use America/Denver.
- Workouts bank Strength or Dexterity. Cardio may bank Constitution instead. Nutrition and sleep bank Constitution. Mental goals bank Intelligence or Wisdom. Social goals bank Charisma. The recruit places the exact ability. A saved Build plan is visible to the DM.
- Awards wait for a DM, admin, curator, or approver. Custom and prescribed logs bank the same. No real account is given the approver role.
- After the 27, the DM awards a temporary buff from the menu. Permanent ability grants are retired. Mustering Grant can still fill the remainder of the 27.
- Logs are visible to squad and Company unless the recruit opts out.
- Group goals pay a world effect, progress, or a narrative reward. Not loot.
- Pre-induction HP is 6 + Constitution modifier, plus Tough and dwarven toughness when those labels match.
- Induction classes are fighter, barbarian, monk, rogue, ranger, and paladin. Spell tables stay empty.
- Skill labels: Arcana displays as Alchemy. Religion displays as Culture. The stored ids stay the rules names.
- Origin labels: Skilled, Lucky, Tough (Tough), Brawler (Tavern Brawler). Magic Initiate is disallowed. Official names are stored. No rules text is stored.
- Squad size is 6.
- Veteran tier from level 3 is no longer milestone XP. John, 2026-10-31: level 4 progress is 4 completed short-term steps of a long-term goal. The count stays on `scoring_config.level_four_steps_required`. Each finished step shows "Goal reward ready: see your DM". A DM or trainer records a buff (Heroic Inspiration, Advantage on one check, or Other) and a free-text story reward. Nothing is granted automatically. Levels 1–3 stay the milestone weeks.
- Sign-in is magic link. Discord and Google buttons are present and off.
- One Company for now. The guild tables can hold another company later.
- Bleakspire is a fortress with a small city around it. No other place description is written.
- Next adventure starts Saturday 2027-01-02. Posters launch 2027-01-04. Saturday 2026-10-31 is skipped. Times are 9–12, 2–5, and 7–10 PM America/Denver. The 7–10 slot is adults only. Location: 1539 E Piper St, Idaho Falls, ID 83401.
- Pricing is display only: Founding Recruit Rate $60/mo added to a gym membership, or $120/mo for non-members with membership included. No payments.
- Weekly check-in is compliance, not a second attribute bank. Score is 2/1/0. Cutoff is Friday 11:59 PM America/Denver. Discord formatters exist and do not send.
- A refund returns to the bank that paid: workouts, nutrition and sleep, mental, social, or attendance. A placement is provisional until a DM or trainer finalizes it in person. Only a finalized placement locks, and only once the next session starts. Provisional placements never lock. What you have not placed never locks.
- A player's own weekly check-in does not finalize anything. Only the in-person DM or trainer check-in does.
- Type is Barlow for body and Barlow Condensed for labels and buttons. All-caps titles use FontMesa Corleone Due (`public/fonts/corleone/Corleone-Due-Regular.woff2`, family `Corleone Due`), then Corleone Regular (`Corleone-Regular.woff2`, family `Corleone`, mixed-case only), then Barlow Condensed 800, then system sans. Both faces are weight 400. Files are gitignored and added at deploy time. The license covers web and app use. The files stay out of the public repo.
- Player-facing species labels: Aasimar is shown as Seraph, and Tiefling as Inferni. Inferni is the working final name. Change `INFERNI` in `src/lib/rules/species-names.ts` if John renames it. The stored ids stay `aasimar` and `tiefling`. See `docs/SPECIES.md`.
- Clearance is a civic honor. Week 4 Known, week 10 Trusted, week 20 Vouched For, week 36 Honored, week 52 Esteemed of Bleakspire. Pillar of Bleakspire starts 26 weeks later and repeats every 26 weeks, numbered from II. Depth thresholds stay 60, 70, 80, 90, and 100. Unlock text stays empty.
- A player NPC note is approved only when `profiles.can_approve_lore` is true. An admin sets that in SQL. Other DMs can read a note and send it back. The flag defaults to false.
- The local test roster is the six officer sheets in `supabase/seed/roster.json`. Squads there are a placeholder. Final scores are stored even when they miss the recruit starting-array check. David's Druid class and the officers' spells are approved. Skill ids `arcana` and `religion` still display as Alchemy and Culture.
- Logo set v2 is approved and committed. The app icon is the helm and kettlebell on Iron Black. The header and sign-in use the transparent mark. The parchment badge is for a light surface. The wide lockup is not used.

## Still open

- Pending John's confirmation: Intelligence and Wisdom goals must be CMART (Clear, Measurable, Attainable, Relevant, Timed) before they are active or count. The co-DM bot stated the rule. It matches the paper Workout Journal. `scoring_config.mental_goal_cmart` defaults true. Set it false to turn the checks off.
- Open for John: "all of their Constitution points" is read as Constitution at `con_goal_score_min` (default 15, the buy cap) and nothing left to place from nutrition and sleep. The other reading is that the whole 27 must be spent. "Up to date" is a log of the chosen Constitution goal in the current company week, not the Friday check-in.

- Whether a weekly check-in should also create the attribute logs, or stay a separate tally. Table Muster creates the missing logs. A check-in submitted by the recruit still does not.
- An SVG of the mark.
- Ranks. Recruit, Sergeant, and Captain are placeholders.
- What each Clearance honor unlocks, and what the depth tiers are called. The unlock text stays empty.
- Milestone week boundary: level 2 from the first day of week 16, level 3 from the first day of week 32.
- `spend_only_at_session` is off.
- Officer NPC bot roles are V2. See `ROADMAP.md`.
