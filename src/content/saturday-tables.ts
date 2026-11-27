/**
 * Saturday table picker copy.
 * Strategy owns this file (locked strings v1, November 25, 2026).
 * Swap wording here. The app fills {tokens} at run time and does not hard-code these sentences elsewhere.
 * Squad names are not copy. They come from squad records and show only in the app.
 * Every table is 16 and up. Do not label a slot as older than that.
 * The public site signup dropdown is a later phase and is not built from this file.
 */

export const SATURDAY_TABLE_COPY = {
  /** Six labels, in order. Do not add a squad name to this line. Do not add MT. */
  labels: {
    "morning:2027-01-02": "Saturday mornings, 9 AM to 12 PM, first game Jan 2, 2027",
    "afternoon:2027-01-02": "Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027",
    "evening:2027-01-02": "Saturday evenings, 7 PM to 10 PM, first game Jan 2, 2027",
    "morning:2027-01-09": "Saturday mornings, 9 AM to 12 PM, first game Jan 9, 2027",
    "afternoon:2027-01-09": "Saturday afternoons, 2 PM to 5 PM, first game Jan 9, 2027",
    "evening:2027-01-09": "Saturday evenings, 7 PM to 10 PM, first game Jan 9, 2027",
  },
  /** Fragments of the labels, used as hall headers. */
  timeHead: {
    morning: "9 AM to 12 PM",
    afternoon: "2 PM to 5 PM",
    evening: "7 PM to 10 PM",
  },
  dateHead: {
    "2027-01-02": "Jan 2, 2027",
    "2027-01-09": "Jan 9, 2027",
  },
  seatsLeft: "{n} of 6 seats left",
  /** Available if Strategy wants the single-seat wording. The picker uses seatsLeft for every open count, including 1, so the wording does not change to create urgency. */
  oneSeatLeft: "1 seat left",
  full: "Full",
  waitlistBody: "This table is full. You can join the waitlist, or pick a different table.",
  joinWaitlist: "Join the waitlist",
  pickDifferent: "Pick a different table",
  /** 14 matches the Shieldmate window used in the app copy and the auth emails. The database does not store a different number. */
  sitTogether: "You'll sit together at this table. Your friend has 14 days to ENLIST.",
  nextTogether:
    "This table is full. The next table with two seats is {table_label}. You can take that one together, join the waitlist here, or pick a different table.",
  askStaffBody:
    "This table has only one seat left, so we won't split you up. Ask staff about this table, or pick a table with two open seats.",
  askStaff: "Ask staff",
  pickTwoSeats: "Pick a table with two open seats",
  askedFor: "You asked for {table_label}. Staff will confirm your seat.",
  staffConfirm: "Staff confirm every seat.",
  heading: "Pick your Saturday table",
  subhead:
    "Your squad is set by the session time you choose. EMC plays every Saturday. Your squad plays every other week. All times are Mountain Time. Every table is 16 and up. Staff confirm every seat.",
  squadByTime: "Your squad is set by the session time you choose.",
  squadForming: "Squad forming",
  notSure:
    "Not sure which time? Pick the Saturday that fits you best. Each squad plays every other week. You can also say you're okay with any other open table. Staff will confirm your seat.",
  anyOpen: "Okay with any other open table",
  emailAsked:
    "You asked for {table_label}, at Empire Strength and Fitness, 1539 E Piper St, Idaho Falls. Your squad is set by the session time you choose. Pay to lock in your spot. Staff confirm your Saturday time within 2 days. If that time doesn't work, we'll find one that does.",
  yourTableLine: "Your table: {table_label}. Staff will confirm your seat.",
  yourTable: "Your table",
  under16:
    "The Empire Mercenary Company is for ages 16 and up. If you're under 16, we'll add you to the teen waitlist and let you know if a teen squad starts.",
  waiver16:
    "If you're 16 or 17, Empire Strength and Fitness may ask you to sign the gym's waiver.",
  friendAsk: "Joining with a friend?",
  /** Same label the character sheet already uses for a Shieldmate. */
  friendName: "Their character or name",
  askStaffEmail: "empiremercenarycompany@gmail.com",
  askStaffSubject: "Shieldmate seats",
  columnTable: "Saturday table",
  columnRequest: "Table request",
  columnSquad: "Squad",
  columnFriend: "Joining with a friend",
  columnFriendName: "Friend",
  staffPlace: "Place an existing squad on a table",
  staffSave: "Save table",
  staffSquad: "Squad",
  staffClear: "Clear this table",
  tableTaken: "That table already has a squad.",
} as const;

export type SaturdayTableKey = keyof typeof SATURDAY_TABLE_COPY.labels;
