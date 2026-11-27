import Link from "next/link";
import { ResultForm } from "@/components/result-form";
import { InstallHelp } from "@/components/install-help";
import { MembershipPanel } from "@/components/membership-panel";
import { ShieldmateInvite } from "@/components/shieldmate-invite";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { TextSizeToggle } from "@/components/text-size-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourReplay } from "@/components/tour";
import { Notice, Page, Panel } from "@/components/ui";
import { saveDisplayName } from "@/lib/actions/character";
import { saveIntake } from "@/lib/actions/intake";
import { signOut } from "@/lib/actions/staff";
import { billingFlags } from "@/lib/billing/flags";
import { billingQueryNotice } from "@/lib/billing/notices";
import { loadOwnBilling } from "@/lib/billing/own-billing";
import { PAYMENT_STEP } from "@/lib/rules/public-copy";
import { firstFullCopy, WAITLIST_COPY } from "@/lib/rules/seat-choice";
import { loadViewer, setupMessage } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { tableKey, yourTableLine } from "@/lib/rules/saturday-tables";
import { loadSaturdayHall } from "@/lib/saturday-board";
import { recruitName } from "@/lib/recruit-name";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string; enlisted?: string }>;
}) {
  const viewer = await loadViewer();
  const setup = setupMessage(viewer);
  const params = searchParams ? await searchParams : {};
  const billingNotice = billingQueryNotice(params.billing);
  const enlisted = params.enlisted === "1";
  const flags = billingFlags();
  const supabase = await createClient();
  const membership = viewer.userId && supabase ? await loadOwnBilling(supabase) : null;
  const shieldmate =
    viewer.userId && supabase
      ? (
          await supabase
            .from("shieldmate_invites")
            .select("code, expires_at, status")
            .or(`host_user_id.eq.${viewer.userId},guest_user_id.eq.${viewer.userId}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data
      : null;
  const squadName =
    supabase && viewer.character?.squad_id
      ? (await supabase.from("squads").select("name").eq("id", viewer.character.squad_id).maybeSingle()).data?.name ?? null
      : null;
  const hall = supabase && viewer.userId ? await loadSaturdayHall(supabase, true) : [];
  const table = hall.find((item) => item.key === tableKey(viewer.intake?.timeslotId ?? "", viewer.intake?.tableStartsOn ?? "")) ?? null;
  const secondTable =
    hall.find((item) => item.key === tableKey(viewer.intake?.secondTimeslotId ?? "", viewer.intake?.secondStartsOn ?? "")) ?? null;
  const timeLabel = viewer.intake?.teenWaitlist
    ? "Teen waitlist"
    : table
      ? yourTableLine(table.label)
      : "Not chosen";
  const shownName = recruitName({
    characterName: viewer.character?.name,
    displayName: viewer.displayName,
    email: viewer.email,
  });
  const initial = shownName.charAt(0).toUpperCase();
  const storedName = (viewer.displayName ?? "").trim();
  const mailbox = (viewer.email ?? "").split("@")[0]?.trim().toLowerCase();
  const nameField = storedName && storedName.toLowerCase() !== mailbox && !storedName.includes("@") ? storedName : "";

  return (
    <Page tour="profile" title="Profile" lede="Who the Company sees when you walk in.">
      {setup ? <Notice>{setup}</Notice> : null}
      {enlisted ? (
        <Notice>
          {viewer.intake?.teenWaitlist
            ? "You're on the teen waitlist. Nothing is charged."
            : viewer.intake?.heldChoice === "waitlist"
              ? WAITLIST_COPY
              : viewer.intake?.heldChoice === "second" && secondTable
                ? firstFullCopy(secondTable.label)
                : `Seat request received${table ? `: ${table.label}` : ""}. ${PAYMENT_STEP}`}
        </Notice>
      ) : null}
      <ThemeToggle />
      <TextSizeToggle />
      <TourReplay className="secondary" />
      <InstallHelp />
      {!viewer.userId ? <SignInPrompt /> : (
        <>
          <Panel>
            <div className="identity">
              {viewer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src={viewer.avatarUrl} alt="" />
              ) : (
                <span className="avatar" aria-hidden="true">
                  {initial}
                </span>
              )}
              <span className="recruit-name">{shownName}</span>
            </div>
            <p>{squadName ?? "No squad yet"}</p>
            <p>{timeLabel}</p>
            {table?.squadLine ? <p>{table.squadLine}</p> : null}
          </Panel>
          <MembershipPanel
            billing={membership}
            wanderlustEnabled={flags.wanderlust}
            gymMember={viewer.intake?.gymMember ?? null}
            membershipVerified={viewer.intake?.membershipVerified ?? false}
            membershipNumber={viewer.intake?.membershipNumber ?? null}
            staffPlan={viewer.intake?.checkoutPlan ?? null}
            ageBand={viewer.intake?.ageBand ?? null}
            teenWaitlist={viewer.intake?.teenWaitlist ?? false}
            hasIntake={Boolean(viewer.intake)}
            heldChoice={viewer.intake?.heldChoice ?? null}
            secondTableLabel={secondTable?.label ?? null}
            couponNote={
              viewer.intake?.checkoutPlan === "standard" && membership?.subscription
                ? "Staff set this rate to $120. The app does not charge the difference."
                : null
            }
          />
          {viewer.userId ? (
            <ShieldmateInvite
              code={shieldmate?.code ? String(shieldmate.code) : null}
              expiresAt={shieldmate?.expires_at ? String(shieldmate.expires_at) : null}
              status={shieldmate?.status ? String(shieldmate.status) : null}
            />
          ) : null}
          <Panel title="Your name">
            <ResultForm action={saveDisplayName} submit="Save name">
              <label>
                What the Company calls you
                <input name="display_name" defaultValue={nameField} maxLength={80} />
              </label>
            </ResultForm>
          </Panel>
          {viewer.intake ? (
            <Panel title="Reminders">
              <p>
                <Link href="/intake">Enlist details</Link>
              </p>
              <p className="text-mute">The Company keeps this preference. This app does not send mail.</p>
              <ResultForm action={saveIntake} submit="Save reminders">
                <input type="hidden" name="dnd" value={viewer.intake.dnd} />
                <input type="hidden" name="gym" value={viewer.intake.gym} />
                <input type="hidden" name="timeslot" value={viewer.intake.teenWaitlist ? "" : (viewer.intake.timeslotId ?? "")} />
                {viewer.intake.ageBand ? <input type="hidden" name="age" value={viewer.intake.ageBand} /> : null}
                {viewer.intake.goals.map((goal) => (
                  <input key={goal} type="hidden" name="goal" value={goal} />
                ))}
                <label className="choice">
                  <input type="checkbox" name="reminders" value="on" defaultChecked={viewer.intake.reminders} />
                  <span className="choice-mark" aria-hidden="true" />
                  <span className="choice-label">Session reminders</span>
                </label>
              </ResultForm>
            </Panel>
          ) : (
            <Panel title="About you">
              <Link href="/intake">Tell us about you</Link>
            </Panel>
          )}
          {billingNotice ? <Notice>{billingNotice}</Notice> : null}
          <form action={signOut}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </>
      )}
    </Page>
  );
}
