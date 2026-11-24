import { Choice } from "@/components/choice";
import { Panel } from "@/components/ui";
import { formatPeriodEnd, statusLabel } from "@/lib/billing/display";
import { canStartCheckout, type OwnBilling } from "@/lib/billing/own-billing";
import { planLookupKey, type CheckoutPlan } from "@/lib/billing/price";
import { productName, planTitle } from "@/lib/billing/plans";
import { PRICE_ONE_LINE, type GymMember } from "@/lib/rules/public-copy";

export function MembershipPanel({
  billing,
  wanderlustEnabled,
  plan,
  gymMember,
}: {
  billing: OwnBilling | null;
  wanderlustEnabled: boolean;
  plan: CheckoutPlan;
  gymMember: GymMember | null;
}) {
  const subscription = billing?.subscription ?? null;
  const period = formatPeriodEnd(subscription?.current_period_end ?? null);
  const showCheckout = canStartCheckout(subscription?.status ?? null);
  const lookup = planLookupKey(plan);

  return (
    <Panel title="Membership">
      <p>{PRICE_ONE_LINE}</p>
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
      {showCheckout ? (
        <form action="/api/checkout" method="post">
          <p>{productName(lookup)}</p>
          {gymMember === "current" && plan !== "member" ? (
            <p className="text-mute">
              You chose the current Empire member rate. Staff confirm your membership before the $60 price is used.
            </p>
          ) : null}
          {wanderlustEnabled ? (
            <Choice name="wanderlust" value="1">
              Wanderlust add-on · $30 a month
            </Choice>
          ) : null}
          <button type="submit">Continue to checkout</button>
        </form>
      ) : null}
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
