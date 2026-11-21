import { Choice } from "@/components/choice";
import { Panel } from "@/components/ui";
import { formatPeriodEnd, statusLabel } from "@/lib/billing/display";
import { canStartCheckout, type OwnBilling } from "@/lib/billing/own-billing";
import { PLAN_CHOICES, planTitle } from "@/lib/billing/plans";

export function MembershipPanel({
  billing,
  wanderlustEnabled,
  couponEnabled,
}: {
  billing: OwnBilling | null;
  wanderlustEnabled: boolean;
  couponEnabled: boolean;
}) {
  const subscription = billing?.subscription ?? null;
  const period = formatPeriodEnd(subscription?.current_period_end ?? null);
  const showCheckout = canStartCheckout(subscription?.status ?? null);

  return (
    <Panel title="Membership">
      {subscription ? (
        <div>
          <p>{planTitle(subscription.plan_lookup_key)}</p>
          <p>Plan {subscription.plan_lookup_key}</p>
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
          {PLAN_CHOICES.map((plan, index) => (
            <div key={plan.lookupKey}>
              <label className="choice">
                <input type="radio" name="plan" value={plan.lookupKey} defaultChecked={index === 0} required />
                <span className="choice-mark radio" aria-hidden="true" />
                <span className="choice-label">
                  {plan.title} · {plan.price}
                </span>
              </label>
              <p className="text-mute">{plan.detail}</p>
            </div>
          ))}
          {wanderlustEnabled ? (
            <Choice name="wanderlust" value="1">
              Wanderlust add-on · $30 a month
            </Choice>
          ) : null}
          {couponEnabled ? <p>Shieldmate bonus: $20 off the first two months.</p> : null}
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
