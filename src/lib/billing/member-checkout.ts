/**
 * One-line switch for the $60 checkout.
 *
 * true (owner, Nov 27 2026): a player who says they are a current Empire
 * member can pay $60 immediately, even with the membership number blank.
 * Staff verify afterward. If they are not a current member, staff use
 * lapse_gym_membership ("Not a current member: move to $120"). That flags
 * the rate. It does not charge the difference and it does not promise a refund.
 *
 * false: hide checkout until staff verify, and do not show a $120 button
 * while that check is open.
 */
export const MEMBER_CHECKOUT_BEFORE_VERIFY = true;
