import { feedbackFailure } from "@/lib/rules/feedback-error";

const ALREADY_FILED = "This week is already filed. Your answers are on the form.";
const ALREADY_SAVED = "That is already saved.";
const NOT_OPEN = "That is not open yet. Tell your coach in person.";
const COULD_NOT = "That could not be saved. Try again, or tell your coach.";

/**
 * Player-facing text for a database error. Company sentences pass through.
 * Constraint names and SQL stay off the screen.
 */
export function playerError(message: string): string {
  const text = message.trim();
  if (!text) return COULD_NOT;
  const feedback = feedbackFailure(text);
  if (feedback !== text) return feedback;
  if (/weekly_checkins_character_id_week_start/i.test(text)) return ALREADY_FILED;
  if (/duplicate key value violates unique constraint/i.test(text)) return ALREADY_SAVED;
  if (/schema cache|could not find the table|relation .+ does not exist/i.test(text)) return NOT_OPEN;
  if (
    /syntax error|sqlstate|invalid input syntax|null value in column|violates (foreign key|check) constraint|operator does not exist|permission denied for/i.test(
      text,
    )
  ) {
    return COULD_NOT;
  }
  return text;
}
