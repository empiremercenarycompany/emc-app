import { describe, expect, it } from "vitest";
import { feedbackFailure } from "./feedback-error";

describe("feedback when the table is missing", () => {
  it("uses a plain sentence", () => {
    expect(feedbackFailure('relation "public.player_feedback" does not exist')).toBe(
      "Feedback isn't open yet. Tell your coach in person.",
    );
    expect(feedbackFailure("Could not find the table 'player_feedback' in the schema cache")).toBe(
      "Feedback isn't open yet. Tell your coach in person.",
    );
    expect(feedbackFailure("Sign in first.")).toBe("Sign in first.");
  });
});
