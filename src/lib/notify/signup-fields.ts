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
