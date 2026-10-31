# UX audit

John asked for the simplest Company book a new recruit can use, and a DM can run at the table. Features stay. The presentation is quieter.

Brand colors stay. Body is Barlow. UI and titles are Barlow Condensed. No font files were added.

## Barracks

- Problem: several panels competed, and the name form sat next to the join action.
- Principle: one primary action, and a first run of at most three steps.
- Change: signed-out and new recruits see Join, Oath, Record work, with one button. The name field is behind a disclosure. The sheet link is the only red action once a recruit exists.

## Character

- Problem: banks, the ledger, and the plan were one wall, and a placement did not say whether it could move.
- Principle: recognition over recall.
- Change: the sheet says Not final yet, Ready to move, and Locked. Not final yet is a placement a DM or trainer has not confirmed. Ready to move is finalized and still refundable. Locked is finalized after the next session starts. Unplaced banks stay labeled as ready. Raising an ability says where it comes from. The Build plan fields are labeled. The ledger uses the same words. Notes stay after the sheet.

## Work

- Problem: prescribed and custom forms were equal, so the first action was unclear.
- Principle: Hick's law and one primary action.
- Change: one Record work form is first and red. Company drills sit in a disclosure. Recent rows say Waiting, Confirmed, or Saved.

## Check-in

- Problem: the lede explained the whole score before the form.
- Principle: short labels, one submit.
- Change: the lede is the deadline. The form is the action. Staff export stays a single link.

## Table Muster

- Problem: the instructions were longer than the table.
- Principle: speed at the table, bulk action.
- Change: one sentence, then session, squad, and Approve all. The roster names recruits instead of asking for an id. The five columns wrap on a phone instead of running together. The red button is the bulk confirm. Finalize stats sits under that, one recruit at a time, with Finalize all for the squad. The waiting lines show before the button.

## Trainer

- Problem: a gym trainer had no place to confirm a Build without opening the whole table.
- Principle: one primary action, and show the state before the confirm.
- Change: Trainer lists each waiting change, then Finalize stats for the recruit you pick. A player cannot open it. The weekly check-in says it does not lock the Build.

## Buffs

- Problem: a permanent grant form asked for a number and a bank.
- Principle: recognition over recall. Do not offer an action that no longer exists.
- Change: the menu lists the three temporary buffs in plain language. Award buff is the staff action. The sheet shows active buffs and Mark used.

## Goals, squad, missions, calendar, journal, library, dice, notes, about, sign-in

- Problem: ledes used internal words, and several screens had no single next step.
- Principle: plain EMC voice and the same card and button styles.
- Change: goals name nutrition, mental, and social, with labeled fields and one red save. The lifting journal calls a shared list a list. Dice says the other roll. Calendar and Schedule are one page, named Schedule. It shows the next session, the session times, and the company calendar. `/calendar` redirects there, and the menu has one Schedule link. The page states the weekly limit and the Build limit without internal names, and an off-week still records work. The company date is shown. The zone name is not. Empty states still say what is missing. Sign-in keeps one red action. Discord and Google stay disabled. Cards stay one border, one spacing scale, no extra decoration. Nav targets and fields are at least 44px.

## Accessibility

- Problem: some fields were placeholder-only, and motion was unspecified.
- Principle: WCAG labels, 44px targets, visible focus, reduced motion.
- Change: the main work fields have labels. Buttons keep a 44px minimum. Focus is a parchment outline. Reduced motion turns off animation and transition.
