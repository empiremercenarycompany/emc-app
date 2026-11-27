"use client";

import { useActionState } from "react";
import { lapseGymMembership, markNoSaturdayTime, saveCheckoutPlan, sendSeatOpenedLink, setMembershipVerified } from "@/lib/actions/membership";
import type { CheckoutPlan } from "@/lib/billing/price";
import {
  MEMBERSHIP_NUMBER_LABEL,
  PLAN_LABEL_MEMBER,
  PLAN_LABEL_STANDARD,
  VERIFY_MEMBERSHIP_NOTE,
} from "@/lib/rules/public-copy";
import type { ActionResult } from "@/lib/types";

export function StaffPaymentForm({
  userId,
  membershipNumber,
  verified,
  verifiedBy,
  verifiedAt,
  canChooseMember,
  needsVerify,
  staffPlan,
  noTime,
  waitlist = false,
}: {
  userId: string;
  membershipNumber: string;
  verified: boolean;
  verifiedBy: string;
  verifiedAt: string;
  canChooseMember: boolean;
  needsVerify: boolean;
  staffPlan: CheckoutPlan | null;
  noTime: boolean;
  waitlist?: boolean;
}) {
  const [verifiedState, verifyAction, verifyPending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => setMembershipVerified(formData),
    null,
  );
  const [priceState, priceAction, pricePending] = useActionState(
    async (_previous: (ActionResult & { url?: string }) | null, formData: FormData) => saveCheckoutPlan(formData),
    null,
  );
  const [lapseState, lapseAction, lapsePending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => lapseGymMembership(formData),
    null,
  );
  const [seatState, seatAction, seatPending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => sendSeatOpenedLink(formData),
    null,
  );
  const [timeState, timeAction, timePending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => markNoSaturdayTime(formData),
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
      <p>
        {MEMBERSHIP_NUMBER_LABEL}: {membershipNumber || "None on file"}
      </p>
      <form action={lapseAction}>
        <input type="hidden" name="user_id" value={userId} />
        <button type="submit" disabled={lapsePending}>
          {lapsePending ? "Saving" : "Not a current member: move to $120"}
        </button>
        <p className="text-mute">
          Flags the rate as $120. The app does not charge the difference. Change the Stripe price only if the next invoice should be $120.
        </p>
        {lapseState && "error" in lapseState ? <p role="alert">{lapseState.error}</p> : null}
        {lapseState && "ok" in lapseState ? <p>Moved to $120.</p> : null}
      </form>
      {waitlist ? (
        <form action={seatAction}>
          <input type="hidden" name="user_id" value={userId} />
          <button type="submit" disabled={seatPending}>
            {seatPending ? "Sending" : "Seat opened: send payment link"}
          </button>
          <p className="text-mute">
            Sends this player a payment link for a Saturday time that has room. Nothing is emailed until you click.
          </p>
          {seatState && "error" in seatState ? <p role="alert">{seatState.error}</p> : null}
          {seatState && "ok" in seatState ? <p>{seatState.note ?? "Payment link sent."}</p> : null}
        </form>
      ) : null}
      <form action={timeAction}>
        <input type="hidden" name="user_id" value={userId} />
        <button type="submit" disabled={timePending || noTime}>
          {timePending ? "Saving" : noTime ? "No time available — owner notified" : "No time available"}
        </button>
        <p className="text-mute">
          Use this when you cannot place a paid recruit in a Saturday time. It emails the owner and leaves the money
          where it is. The player is not emailed.
        </p>
        {timeState && "error" in timeState ? <p role="alert">{timeState.error}</p> : null}
        {timeState && "ok" in timeState ? <p>Owner notified.</p> : null}
      </form>
      <form action={priceAction} className="flex flex-col gap-3">
        <input type="hidden" name="user_id" value={userId} />
        <fieldset>
          <legend>Price</legend>
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
        {!membershipNumber ? <p role="note">No membership number on file. $60 is still allowed before you verify.</p> : null}
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
