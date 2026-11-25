import { IntakeForm } from "@/components/intake-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { Notice, Page } from "@/components/ui";
import { loadViewer, setupMessage } from "@/lib/company";
import { hallForApp, normalizeTimeslotId, tableKey } from "@/lib/rules/saturday-tables";
import { loadSaturdayHall } from "@/lib/saturday-board";
import { createClient } from "@/lib/supabase/server";

export default async function IntakePage({
  searchParams,
}: {
  searchParams?: Promise<{ src?: string; table?: string; start?: string }>;
}) {
  const viewer = await loadViewer();
  const params = searchParams ? await searchParams : {};
  const fromUrl = typeof params.src === "string" ? params.src.trim().slice(0, 80) : "";
  const signupSrc = fromUrl || viewer.intake?.signupSrc || "";
  const setup = setupMessage(viewer);
  const supabase = await createClient();
  const showNames = Boolean(viewer.userId);
  const tables = supabase ? await loadSaturdayHall(supabase, showNames) : hallForApp([], showNames);
  const requested = tableKey(
    normalizeTimeslotId(typeof params.table === "string" ? params.table : "") ?? "",
    typeof params.start === "string" ? params.start : "",
  );
  const stored = tableKey(viewer.intake?.timeslotId ?? "", viewer.intake?.tableStartsOn ?? "");

  return (
    <Page tour="about-you" title="About you" lede="This is you, not your character.">
      {setup ? <Notice>{setup}</Notice> : null}
      {!viewer.userId ? <SignInPrompt label="Sign in to save" /> : null}
      <IntakeForm
        canSave={Boolean(viewer.userId)}
        tables={tables}
        signupSrc={signupSrc}
        initial={
          viewer.intake
            ? {
                dnd: viewer.intake.dnd,
                gym: viewer.intake.gym,
                goals: viewer.intake.goals,
                timeslot: viewer.intake.timeslotId ?? "",
                tableKey: requested || stored || "",
                age: viewer.intake.ageBand ?? "",
                gymMember: viewer.intake.gymMember ?? "",
                membershipNumber: viewer.intake.membershipNumber ?? "",
                reminders: viewer.intake.reminders,
                phone: viewer.intake.phone ?? "",
                species: viewer.intake.speciesIdea ?? "",
                classIdea: viewer.intake.classIdea ?? "",
                fitness: viewer.intake.fitnessExperience ?? "",
                backstory: viewer.intake.backstoryIdea ?? "",
                withFriend: viewer.intake.withFriend,
                friendName: viewer.intake.friendName ?? "",
                anyOpen: viewer.intake.anyOpenTable,
              }
            : requested
              ? {
                  dnd: "never",
                  gym: "new",
                  goals: ["Sleep 7 hours"],
                  timeslot: "",
                  tableKey: requested,
                  reminders: false,
                  phone: "",
                  species: "",
                  classIdea: "",
                  fitness: "",
                  backstory: "",
                }
              : undefined
        }
      />
    </Page>
  );
}
