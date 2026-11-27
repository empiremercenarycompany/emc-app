import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { MembershipPanel } from "@/components/membership-panel";
import { StaffPaymentForm } from "@/components/staff-payment-form";
import { ShieldmateInvite } from "@/components/shieldmate-invite";
import { Notice, Page } from "@/components/ui";
import { isLocalHost } from "@/lib/dev-login";
import { PAYMENT_STEP } from "@/lib/rules/public-copy";
import { firstFullCopy, WAITLIST_COPY } from "@/lib/rules/seat-choice";

export const dynamic = "force-dynamic";

/** Local screenshots only. Not linked from the app. */
export default async function PersonaPreviewPage() {
  const host = (await headers()).get("host");
  if (!isLocalHost(host)) notFound();
  const billing = { customer: null, subscription: null };

  return (
    <Page title="Persona preview" lede="Local only.">
      <section id="post-save">
        <Notice>Seat request received: Saturday mornings, 9 AM to 12 PM, first game Jan 2, 2027. {PAYMENT_STEP}</Notice>
      </section>
      <section id="checkout-120">
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember="not_yet"
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="18_plus"
          teenWaitlist={false}
          hasIntake
        />
      </section>
      <section id="checkout-60">
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember="current"
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="18_plus"
          teenWaitlist={false}
          hasIntake
        />
      </section>
      <section id="checkout-teen">
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember={null}
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="under_16"
          teenWaitlist
          hasIntake
        />
      </section>
      <section id="shieldmate">
        <ShieldmateInvite code="AB12CD34" expiresAt={new Date(Date.now() + 9 * 86400000).toISOString()} status="open" />
      </section>
      <section id="both-open">
        <Notice>First choice and second choice both have room. {PAYMENT_STEP}</Notice>
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember="not_yet"
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="18_plus"
          teenWaitlist={false}
          hasIntake
          heldChoice="first"
        />
      </section>
      <section id="second-open">
        <Notice>{firstFullCopy("Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027")}</Notice>
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember="not_yet"
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="18_plus"
          teenWaitlist={false}
          hasIntake
          heldChoice="second"
          secondTableLabel="Saturday afternoons, 2 PM to 5 PM, first game Jan 2, 2027"
        />
      </section>
      <section id="waitlist">
        <Notice>{WAITLIST_COPY}</Notice>
        <MembershipPanel
          billing={billing}
          wanderlustEnabled={false}
          gymMember="not_yet"
          membershipVerified={false}
          membershipNumber={null}
          staffPlan={null}
          ageBand="18_plus"
          teenWaitlist={false}
          hasIntake
          heldChoice="waitlist"
        />
      </section>
      <section id="seat-opened">
        <StaffPaymentForm
          userId="11111111-1111-4111-8111-111111111111"
          membershipNumber=""
          verified={false}
          verifiedBy=""
          verifiedAt=""
          canChooseMember={false}
          needsVerify={false}
          staffPlan={null}
          noTime={false}
          waitlist
        />
        <p>Payment link sent.</p>
      </section>
      <section id="no-time">
        <Notice>
          No Saturday time for a recruit. The owner is emailed at empiremercenarycompany@gmail.com. Talk to the player.
          This page cannot move the money.
        </Notice>
        <p>No time available</p>
      </section>
    </Page>
  );
}
