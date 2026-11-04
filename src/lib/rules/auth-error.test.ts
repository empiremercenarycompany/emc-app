import { describe, expect, it } from "vitest";
import { signInError } from "./auth-error";

describe("sign-in errors", () => {
  it("hides mail and rate-limit text", () => {
    expect(signInError("Email rate limit exceeded")).toBe("Wait a moment, then ask for another link.");
    expect(signInError("For security purposes, you can only request this after 50 seconds.")).toBe(
      "Wait a moment, then ask for another link.",
    );
    expect(signInError("Unable to validate email address: invalid format")).toBe("That email does not look right.");
    expect(signInError("Error sending magic link")).toBe("The sign-in link could not be sent. Try again in a moment.");
    expect(signInError("Signups not allowed for otp")).toBe("Sign-in links are not open yet. Tell your trainer in person.");
    expect(signInError("Check your email for the sign-in link.")).toBe("Check your email for the sign-in link.");
  });
});
