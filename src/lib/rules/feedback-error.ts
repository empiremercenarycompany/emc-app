const MISSING = "Feedback isn't open yet. Tell your coach in person.";

/** A missing table should read as a closed book, not a database error. */
export function feedbackFailure(message: string): string {
  if (/player_feedback/i.test(message) && /schema cache|does not exist|Could not find/i.test(message)) return MISSING;
  return message;
}
