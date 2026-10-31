import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { GroupGoalForm } from "@/components/group-goal-form";
import { Page } from "@/components/ui";
import { echoGroupGoal } from "@/lib/actions/staff";
import { isLocalHost } from "@/lib/dev-login";

const SQUADS = [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", name: "RBM" }];

export default async function GroupGoalCheckPage() {
  const host = (await headers()).get("host");
  if (!isLocalHost(host)) notFound();
  return (
    <Page title="Group goal" lede="This check does not post a mission.">
      <GroupGoalForm squads={SQUADS} action={echoGroupGoal} />
    </Page>
  );
}
