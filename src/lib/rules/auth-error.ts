const WAIT = "Wait a moment, then ask for another link.";
const EMAIL = "That email does not look right.";
const CLOSED = "Sign-in links are not open yet. Tell your coach in person.";
const FAILED = "The sign-in link could not be sent. Try again in a moment.";

/** Player-facing text for a sign-in failure. Status codes and mail errors stay off the screen. */
export function signInError(message: string): string {
  const text = message.trim();
  if (!text) return FAILED;
  if (/rate limit|only request this after|too many requests/i.test(text)) return WAIT;
  if (/invalid format|unable to validate email|valid email/i.test(text)) return EMAIL;
  if (/signups not allowed|otp.*disabled|provider is not enabled/i.test(text)) return CLOSED;
  if (/error sending|smtp|magic link|network|failed to fetch|timeout|econn|jwt|sqlstate|exception|\b[45]\d\d\b/i.test(text)) {
    return FAILED;
  }
  if (text.length > 160) return FAILED;
  return text;
}
