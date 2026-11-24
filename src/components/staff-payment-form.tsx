"use client";

import { useActionState } from "react";
import { saveCheckoutPlan, setMembershipVerified } from "@/lib/actions/membership";
import type { CheckoutPlan } from "@/lib/billing/price";
import { PLAN_LABEL_MEMBER, PLAN_LABEL_STANDARD, VERIFY_MEMBERSHIP_NOTE } from "@/lib/rules/public-copy";
import type { ActionResult } from "@/lib/types";

export function StaffPaymentForm({
  userId,
  verified,
  verifiedBy,
  verifiedAt,
  canChooseMember,
  needsVerify,
  staffPlan,
}: {
  userId: string;
  verified: boolean;
  verifiedBy: string;
  verifiedAt: string;
  canChooseMember: boolean;
  needsVerify: boolean;
  staffPlan: CheckoutPlan | null;
}) {
  const [verifiedState, verifyAction, verifyPending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => setMembershipVerified(formData),
    null,
  );
  const [priceState, priceAction, pricePending] = useActionState(
    async (_previous: (ActionResult & { url?: string }) | null, formData: FormData) => saveCheckoutPlan(formData),
    null,
  );
  const memberChecked = canChooseMember && staffPlan === "member";

  return (
    <div className="flex flex-col gap-3">
      <form action={verifyAction} className="flex flex-col gap-3">
        <input type="hidden" name="user_id" value={userId} />
        <label>
          Membership verified
          <select name="verified" defaultValue={verified ? "1" : "0"}>
            <option value="0">Not verified</option>
            <option value="1">Verified</option>
          </select>
        </label>
        {verified && verifiedAt ? (
          <p>
            Verified {verifiedAt}
            {verifiedBy ? ` by ${verifiedBy}` : ""}.
          </p>
        ) : null}
        <button type="submit" disabled={verifyPending}>
          {verifyPending ? "Saving" : "Save verification"}
        </button>
        {verifiedState && "error" in verifiedState ? <p role="alert">{verifiedState.error}</p> : null}
        {verifiedState && "ok" in verifiedState ? <p>Saved.</p> : null}
      </form>
      <form action={priceAction} className="flex flex-col gap-3">
        <input type="hidden" name="user_id" value={userId} />
        <fieldset>
          <legend>Price before the payment link</legend>
          <label className="choice">
            <input type="radio" name="plan" value="standard" defaultChecked={!memberChecked} />
            <span className="choice-mark radio" aria-hidden="true" />
            <span className="choice-label">{PLAN_LABEL_STANDARD}</span>
          </label>
          <label className="choice">
            <input type="radio" name="plan" value="member" defaultChecked={memberChecked} disabled={!canChooseMember} />
            <span className="choice-mark radio" aria-hidden="true" />
            <span className="choice-label">{PLAN_LABEL_MEMBER}</span>
          </label>
        </fieldset>
        {needsVerify ? <p role="note">{VERIFY_MEMBERSHIP_NOTE}</p> : null}
        <button name="intent" value="save" type="submit" disabled={pricePending}>
          Save price
        </button>
        <button name="intent" value="link" type="submit" disabled={pricePending}>
          {pricePending ? "Saving" : "Create payment link"}
        </button>
        {priceState && "error" in priceState ? <p role="alert">{priceState.error}</p> : null}
        {priceState && "ok" in priceState && !priceState.url ? <p>Saved.</p> : null}
        {priceState && "url" in priceState && priceState.url ? (
          <p>
            Payment link <a href={priceState.url}>{priceState.url}</a>
          </p>
        ) : null}
      </form>
    </div>
  );
}
