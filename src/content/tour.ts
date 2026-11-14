/**
 * Spoken tour lines. Wording edits belong in this file.
 * The walk reads these sentences and does not hard-code them.
 */

export type TourStop = {
  id: string;
  title: string;
  route: string;
  /** Matches a data-tour attribute. Null centers the card and skips the spotlight. */
  target: string | null;
  /** Omit the stop until the character reaches this level. */
  minLevel?: number;
  lines?: string[];
  show?: string;
  why?: string;
  how?: string;
};

export const TOUR_STOPS: TourStop[] = [
  {
    id: "welcome",
    title: "Welcome",
    route: "/",
    target: null,
    lines: [
      "I'm Alexandria. I do the talking around here. I was the one who could. Come with me. I'll show you how this hall actually works, not just what the signs say.",
      "Think of the app as our hall. We built every room for a reason, and I'm rather proud of that. I'll tell you why it helps you, and the taps to use it. Between us, I'll also point out the desks people walk straight past.",
      "When you're ready, walk with me.",
    ],
  },
  {
    id: "barracks",
    title: "The Barracks",
    route: "/",
    target: "barracks",
    show: "This is the Barracks, the yard you walk into first. Your week, your squad, the next muster, and whatever the Company posted, all on this board. On a first visit we even laid out three cards, because I like a recruit who knows where to put their feet.",
    why: "If something is due this week, it shows up here. You shouldn't have to hunt through the hall for the next thing that needs you.",
    how: "Tap Barracks on the bottom bar, or the Company mark at the top. New and signed in, with no character yet? Start with Fill Out Recruitment Papers. After that: File your check-in, or Record work. And look for Tell us about you. That desk is easy to miss, and I'll take you there next. Some notices, missions, and book notes only appear once there's something to show. An empty board isn't broken.",
  },
  {
    id: "recruitment",
    title: "Recruitment Papers",
    route: "/character/new",
    target: "recruitment",
    show: "These are your Recruitment Papers. Four short steps: who you are, your past, your people, and where you start strongest. The Company fills the skills, the tool, and the feat from the background you pick. I had this path cut down on purpose. Nobody should need a lecture to walk in.",
    why: "You leave with a finished character, not a homework assignment. Your sheet is waiting when you sign.",
    how: "From the Barracks or Character, tap Fill Out Recruitment Papers. Step through Who you are, Your past, Your people, and Where do you start strongest. Not sure? Pick for me will choose a sensible default on the step you're on. Review, then Sign the Papers.",
  },
  {
    id: "about-you",
    title: "About you",
    route: "/intake",
    target: "about-you",
    show: "Now. Lean in. This desk is called About you, and people walk right past it. Four short answers about you, not your character. The one that matters is the time you can actually keep. Your squad is set by that time. That's how the hall really seats you.",
    why: "We put you with the people who train when you do. You don't pick a squad off a list, and you shouldn't have to guess.",
    how: "After your papers, look on the Barracks for Tell us about you. Or open Schedule and tap Pick a time, or find About you under Profile. Tap whether you've played, your gym experience, a first goal if you want one, and your preferred time. Optionally tick Session reminders, then Save. Don't skip this one.",
  },
  {
    id: "wayfinding",
    title: "Finding your way",
    route: "/",
    target: "wayfinding",
    show: "Two little tools in the corner: the Menu, and the question mark. The Menu is how you reach the rooms that aren't on the bottom bar. The ? turns on Explain words, company speech, translated. And if something in the hall bothers you, you can talk back. I like a system that allows that.",
    why: "You shouldn't need to already speak our language, or to memorize where every door is.",
    how: "Tap the Menu at the top right. You'll see Play, Train, Company, and Profile. Tap ? to turn Explain words on. Outlined words open a plain meaning, or open the Codex from the banner. For a note, tap Feedback, or Send feedback in the Menu. Write the note, leave out phone numbers and addresses, and send it. Staff can read it.",
  },
  {
    id: "character",
    title: "Your character",
    route: "/character",
    target: "character",
    show: "And here you are. Overview, Skills, Gear, Story, Progress. The whole person in one sheet, with a likeness if you want one. This is the one sheet you'll bring to the table.",
    why: "When you sit down, you're not hunting through three rooms for your numbers. This is the page you open.",
    how: "Character is on the bottom bar. Tap the tabs along the top of the sheet. Save a portrait if you like. JPEG, PNG, or WebP. Skills and Gear have a Roll button that opens the dice right here. Story is where you can submit people you've met: name, how you know them, what they're like, then Submit for review. Gear starts empty. Nothing carried yet. That's a space waiting to be filled as you pick things up, not a missing room.",
  },
  {
    id: "shieldmate",
    title: "Shieldmate",
    route: "/character",
    target: "shieldmate",
    show: "One more thing on this page, and it hides low, under the sheet, a checkbox most people miss. Shieldmate. If you came in with a friend, this is how you walk in together. Same session time, same squad, and one thing you grew up doing: a game, an instrument, a trade, or a language. They have fourteen days to enlist. Don't leave this room without looking for it.",
    why: "You shouldn't have to be the new face alone if you already arrived as a pair.",
    how: "On Character, look below the sheet. Tick Signing up with a friend. Enter their character or name, pick the kind and the proficiency, write what you used to do together, and send the request. Ask them to choose the same session time. You can withdraw a pending request if you need to.",
  },
  {
    id: "progress",
    title: "Progress",
    route: "/character?tab=progress",
    target: "progress",
    show: "Progress is where your growth lives. What's ready to assign, what you can raise, and under Record of changes, the honest history of the work you did. We kept this clean on purpose. Nothing here spends itself while you're not looking.",
    why: "You can see what your week actually did for your character. A DM or trainer confirms the change before it locks. You choose every increase.",
    how: "On Character, open the Progress tab. Ready to assign shows growth from workouts, nutrition and sleep, mental goals, social goals, and attendance. When an increase is ready, tap Raise and pick the ability. Record of changes lists each entry underneath. Target scores and your personal notes are on this tab too.",
  },
  {
    id: "goals",
    title: "Goals",
    route: "/goals",
    target: "goals",
    show: "Goals are the work of the Company. Sleep, meals, a mental aim, a social one, written down, with a shape, not just a hope. Plain on purpose. Fancy boards get ignored.",
    why: "A written goal is easier to keep, and it's what feeds that part of your character's growth. A vague \"I studied\" gives us nothing I can use.",
    how: "Goals is on the bottom bar, or Open goals from the Barracks. Choose your Constitution habit, then Log this week. Add a mental goal or a Charisma goal, write it so it's clear, measurable, and has a by-when, and mark it Done when you meet it. Longer goals show up here later, when you're ready for them.",
  },
  {
    id: "work",
    title: "Work",
    route: "/work",
    target: "work",
    show: "The work room. You tell us what you did, in plain words, a lift, a run, a stretch, or one of the Company's drills. Staff confirm it before that growth is ready to assign. I like a room that trusts ordinary speech.",
    why: "The kind of work decides which ability that growth can raise. You don't have to know the numbers. Your coach and the staff handle that part.",
    how: "Menu, then Train, then Work, or Record work from the Barracks. Write what you did, choose the kind: Lifting and strength, Mobility and sports, or Cardio and conditioning. Set the date, tap Record work. Or open Company drills, pick your equipment, and Record this drill. Recent logs show Waiting or Confirmed. If no drills are listed, they haven't been posted for you yet.",
  },
  {
    id: "journal",
    title: "The Journal",
    route: "/journal",
    target: "journal",
    show: "The Journal is workout programming from a coach, not a blank page. Your coach posts the approved list. You build the workout, then record what you actually did. This is one I'm proud of. It keeps the plan honest.",
    why: "You're not inventing a plan from nothing, and you're not stuck with a plan you can't run.",
    how: "Menu, then Train, then Journal. Choose a List, name the workout, and tap or drag exercises from Approved into Your workout. Set targets, Save workout, then Record Work. Squad can see this session stays on unless you turn it off. If you see no lists yet, your coach hasn't posted them. The room isn't broken.",
  },
  {
    id: "library",
    title: "The Library",
    route: "/library",
    target: "library",
    show: "The Library holds the Company's drills, each written three ways: gym, lighter, and home. We wanted you to have a version you can actually do, wherever you are.",
    why: "If you're not in the full gym, you still have a drill that counts. You pick the version that matches the room you're in.",
    how: "Menu, then Company, then Library. Browse the cards. To log that you did one, take it to Work and record the drill there. If the Library is empty, the drills haven't been posted yet.",
  },
  {
    id: "check-in",
    title: "Weekly Check-in",
    route: "/check-in",
    target: "check-in",
    show: "Friday has its own desk, and it is not the same as signing the table. Four quick questions: how many sessions you got in, and whether you met your Wisdom, Intelligence, and Charisma aims. I had this kept short on purpose.",
    why: "Honest answers help your coach support your goals. A miss isn't a failure. It tells us where to help. Nothing here locks your character.",
    how: "Menu, then Train, then Check-in, or File your check-in from the Barracks. Pick the week, tap the workout card, then Yes or Not this week on the three aims. File your check-in by Friday, 11:59 PM. You can change answers until then. A Clearance list on this page shows standing over the weeks. You don't need it on day one. Remember the name: this is the weekly Check-in. The table uses different words.",
  },
  {
    id: "schedule",
    title: "The Schedule",
    route: "/schedule",
    target: "schedule",
    show: "The calendar hall. Next session, the times we keep, the meeting place. Your time is marked Yours. A row marked Three-parter is one session. A gap marked Off-week still lets you record work.",
    why: "You shouldn't have to ask when we sit, or whether an off-week means you stop.",
    how: "Menu, then Play, then Schedule. If you haven't chosen a time, tap Pick a time. That takes you to About you. When you're at the table that day, tap I was there. That's attendance for the session, not the Friday Check-in.",
  },
  {
    id: "squad",
    title: "Squad",
    route: "/squad",
    target: "squad",
    show: "Your squad isn't a club you pick off a list. It's the people who chose the same time you did. This room is their names, and the lifts they were willing to share.",
    why: "You can see who will be at your table. It makes the hall feel smaller in the right way.",
    how: "Menu, then Company, then Squad, or Open squad from the Barracks. Read the roster and the shared lifts. There's no join button here: your time already seated you. If it's empty, squads haven't been posted yet.",
  },
  {
    id: "missions",
    title: "Missions",
    route: "/missions",
    target: "missions",
    show: "The contract board. When the Company posts a job or a barracks challenge, it hangs here. Under Table, you mark that you sat the session. The button says Check in, which I know is almost the same words as Friday's desk. It isn't the same desk. Worth learning the difference now, recruit. It'll save you a frown later.",
    why: "You can see the job, add a little progress when you did the work, and record that you made the session. Attendance is its own kind of growth, counted outside the week's other work.",
    how: "Missions is on the bottom bar. Open a contract, enter an amount and an optional note, tap Add progress. Under Table, tap Check in when you were there. If you see No active missions, open the Schedule. Nothing's posted yet.",
  },
  {
    id: "sirath",
    title: "The Sirath",
    route: "/sirath",
    target: "sirath",
    show: "This is The Sirath. What your squad has learned about Bleakspire. Not the rules book. A worn journal of people, places, and what you'd hear in the street. It only holds what you've earned. That's on purpose.",
    why: "You shouldn't have to remember every name from a session, and you shouldn't see what you haven't learned yet. The book grows as your squad does.",
    how: "Menu, then Company, then The Sirath. Search or filter, tap an entry, follow the links in the book. New notes can show a badge on the Menu. The pages fill in as your squad learns things. An empty book, or a sealed name, isn't a mistake. You start as a recruit. The rest is earned.",
  },
  {
    id: "codex",
    title: "The Codex",
    route: "/codex",
    target: "codex",
    show: "The Codex is every word in the app, explained in plain language. The game, the gym, and how the Company works. The ? in the header is the same help, wherever you are. Nobody here has to pretend they know what a saving throw is.",
    why: "A new recruit should be able to tap a word and get a meaning, not a lecture.",
    how: "Codex is on the bottom bar. Search, try HP or set, or start with the New here? entries: Your six abilities, How a week works, and Gym words, no judgment. Help & FAQ in the Menu opens this same book. The FAQ page is still waiting on answers, so use the glossary and the ? for now.",
  },
  {
    id: "dice",
    title: "Dice",
    route: "/dice",
    target: "dice",
    show: "Sometimes you just need a die. This room is honest about it: any die you want, a modifier, advantage or disadvantage. Rolls work even before you have an account. I like a tool that doesn't make you wait.",
    why: "When the table asks for a check, you can roll from here, with your character's numbers if you're signed in.",
    how: "Menu, then Play, then Dice. Pick a die, set a modifier if you need one, tap Roll. Use Advantage or Disadvantage when the table calls for it. If you have a character, tap Save roll, or use Sheet checks. The Roll buttons on your sheet open this same roller.",
  },
  {
    id: "profile",
    title: "Profile",
    route: "/profile",
    target: "profile",
    show: "Your desk: the name we call you, your time, Larger text, and a way to put the hall in your pocket. We didn't forget the practical things.",
    why: "You can fix what we call you, keep your time current, and read the app more comfortably. If you're offline, a page you've already opened can still come up.",
    how: "Menu, then Profile. Save the name the Company should use. Reminders live here once About you is filed. This app doesn't send the mail itself. Tap Larger text if you want it. Under Add the app, tap Install, or on iPhone use Share, then Add to Home Screen. If a page hasn't been opened yet and you're offline, the hall will say so, and that page waits for a signal.",
  },
  {
    id: "about",
    title: "About",
    route: "/about",
    target: "about",
    show: "If you ever want the short version of who we are, it lives here. Train. Record. Advance. A squad, a story, and a reason to keep showing up.",
    why: "It's a quiet page, and that's the point. The Company's own words, and credit to the rules we play by, all in one quiet place.",
    how: "Menu, then Company, then About. Read it when you like. You won't need it to train or to play.",
  },
  {
    id: "sign-off",
    title: "That's the hall",
    route: "/",
    target: null,
    lines: [
      "That's the hall. You won't need every room today. Start with your papers, your time, don't skip About you, and this week's check-in. Look low on your character page for Shieldmate if you came with a friend. The rest will still be here.",
      "If a word looks like company speech, tap the ?. If something's off, send feedback. I'll be around. Go on. Make me look like I briefed you properly.",
      "Build Your Legend. Become the Hero.",
    ],
  },
];
