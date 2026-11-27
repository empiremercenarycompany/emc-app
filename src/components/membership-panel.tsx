import { Choice } from "@/components/choice";
import { Panel } from "@/components/ui";
import { checkoutOffer } from "@/lib/billing/checkout-offer";
import { formatPeriodEnd, statusLabel } from "@/lib/billing/display";
import type { OwnBilling } from "@/lib/billing/own-billing";
import { planLookupKey, type CheckoutPlan } from "@/lib/billing/price";
import { productName, planTitle } from "@/lib/billing/plans";
import { PAYMENT_STEP, PRICE_ONE_LINE, type GymMember } from "@/lib/rules/public-copy";

export function MembershipPanel({
  billing,
  wanderlustEnabled,
  gymMember,
  membershipVerified,
  membershipNumber,
  staffPlan,
  ageBand,
  teenWaitlist,
  hasIntake,
  couponNote,
}: {
  billing: OwnBilling | null;
  wanderlustEnabled: boolean;
  gymMember: GymMember | null;
  membershipVerified: boolean;
  membershipNumber: string | null;
  staffPlan: CheckoutPlan | null;
  ageBand: string | null;
  teenWaitlist: boolean;
  hasIntake: boolean;
  couponNote?: string | null;
}) {
  const subscription = billing?.subscription ?? null;
  const period = formatPeriodEnd(subscription?.current_period_end ?? null);
  const offer = checkoutOffer({
    hasIntake,
    ageBand,
    teenWaitlist,
    gymMember,
    membershipVerified,
    membershipNumber,
    staffPlan,
    subscriptionStatus: subscription?.status ?? null,
  });
  const lookup = offer.state === "pay" ? planLookupKey(offer.plan) : null;

  return (
    <Panel title="Membership">
      <p>{PRICE_ONE_LINE}</p>
      <p>{PAYMENT_STEP}</p>
      {subscription ? (
        <div>
          <p>{productName(subscription.plan_lookup_key)}</p>
          <p>{planTitle(subscription.plan_lookup_key)}</p>
          <p>Status {statusLabel(subscription.status)}</p>
          {period ? <p>Current period ends {period}</p> : null}
          {subscription.cancel_at_period_end ? <p>Cancels at the end of the current period.</p> : null}
          {wanderlustEnabled && subscription.wanderlust ? <p>Wanderlust add-on is on this membership.</p> : null}
        </div>
      ) : billing ? (
        <p>No membership on file.</p>
      ) : null}
      {offer.state === "pay" && lookup ? (
        <form action="/api/checkout" method="post">
          <p>{productName(lookup)}</p>
          {couponNote ? <p>{couponNote}</p> : null}
          {wanderlustEnabled ? (
            <Choice name="wanderlust" value="1">
              Wanderlust add-on · $30 a month
            </Choice>
          ) : null}
          <button type="submit">{offer.button}</button>
        </form>
      ) : null}
      {offer.state === "hold" || offer.state === "closed" ? <p>{offer.message}</p> : null}
      {billing?.customer ? (
        <form action="/api/billing-portal" method="post">
          <button className="secondary" type="submit">
            Update card or cancel
          </button>
        </form>
      ) : null}
    </Panel>
  );
}
