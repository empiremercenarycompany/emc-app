import { SATURDAY_TABLE_COPY } from "@/content/saturday-tables";

export type SignupRecord = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joined: string;
  phone: string;
  trainingSlot: string;
  speciesIdea: string;
  classIdea: string;
  fitnessGoals: string;
  gymExperience: string;
  fitnessExperience: string;
  dndExperience: string;
  sessionReminders: string;
  backstory: string;
  empireMembership: string;
  membershipNumber: string;
  membershipVerified: string;
  verifiedBy: string;
  verifiedAt: string;
  signupSrc: string;
  tableLabel: string;
  tableRequest: string;
  tableSquad: string;
  withFriend: string;
  friendName: string;
};

export const SIGNUP_COLUMNS: { key: keyof SignupRecord; label: string }[] = [
  { key: "userId", label: "User id" },
  { key: "email", label: "Email" },
  { key: "displayName", label: "Display name" },
  { key: "role", label: "Role" },
  { key: "joined", label: "Joined" },
  { key: "phone", label: "Phone" },
  { key: "trainingSlot", label: "Training slot" },
  { key: "speciesIdea", label: "Species idea" },
  { key: "classIdea", label: "Class idea" },
  { key: "fitnessGoals", label: "Fitness goals" },
  { key: "gymExperience", label: "Gym experience" },
  { key: "fitnessExperience", label: "Fitness experience" },
  { key: "dndExperience", label: "D&D experience" },
  { key: "sessionReminders", label: "Session reminders" },
  { key: "backstory", label: "Backstory" },
  { key: "empireMembership", label: "Empire membership" },
  { key: "membershipNumber", label: "Empire Strength and Fitness membership number" },
  { key: "membershipVerified", label: "Membership verified" },
  { key: "verifiedBy", label: "Verified by" },
  { key: "verifiedAt", label: "Verified at" },
  { key: "signupSrc", label: "Signup source" },
  { key: "tableLabel", label: SATURDAY_TABLE_COPY.columnTable },
  { key: "tableRequest", label: SATURDAY_TABLE_COPY.columnRequest },
  { key: "tableSquad", label: SATURDAY_TABLE_COPY.columnSquad },
  { key: "withFriend", label: SATURDAY_TABLE_COPY.columnFriend },
  { key: "friendName", label: SATURDAY_TABLE_COPY.columnFriendName },
];

export type NoticeField = { label: string; value: string };

export function noticeFields(record: SignupRecord): NoticeField[] {
  return SIGNUP_COLUMNS.map((column) => ({ label: column.label, value: record[column.key] }));
}

export function noticeBody(fields: NoticeField[]): string {
  return fields
    .map((field) => {
      const value = field.value.trim();
      return `${field.label}: ${value || "—"}`;
    })
    .join("\n");
}
