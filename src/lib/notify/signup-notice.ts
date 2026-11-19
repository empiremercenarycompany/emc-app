/**
 * New-account mail starts with this deploy.
 * An auth user created at or before this instant is not new.
 * The signup_notified_at migration also stamps every profile that already exists.
 */
export const SIGNUP_NOTICE_AFTER_ISO = "2026-11-19T20:14:00.000Z";

export type SignupNoticeInput = {
  authCreatedAt: string | null;
  profileCreatedAt: string | null;
  /**
   * Null means the column is present and the send has not been claimed.
   * Undefined means the column is not there yet.
   */
  signupNotifiedAt: string | null | undefined;
  hasCharacter: boolean;
  hasIntake: boolean;
};

/** True when this visit should try to claim the one-time new-account notice. */
export function shouldNotifyNewAccount(input: SignupNoticeInput): boolean {
  if (input.signupNotifiedAt !== null) return false;
  const cutoff = Date.parse(SIGNUP_NOTICE_AFTER_ISO);
  const authCreated = input.authCreatedAt ? Date.parse(input.authCreatedAt) : Number.NaN;
  const afterDeploy = Number.isFinite(authCreated) && authCreated > cutoff;
  const profileCreated = input.profileCreatedAt ? Date.parse(input.profileCreatedAt) : Number.NaN;
  const profileAlreadyExisted = !Number.isFinite(profileCreated) || profileCreated <= cutoff;
  const priorActivity = profileAlreadyExisted || input.hasCharacter || input.hasIntake;
  return afterDeploy || !priorActivity;
}
