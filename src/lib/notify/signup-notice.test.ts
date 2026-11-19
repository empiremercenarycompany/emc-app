import { describe, expect, it } from "vitest";
import { shouldNotifyNewAccount, SIGNUP_NOTICE_AFTER_ISO } from "./signup-notice";

const afterDeploy = "2026-11-19T21:30:00.000Z";
const beforeDeploy = "2026-08-01T00:00:00.000Z";

describe("new account notice", () => {
  it("does not treat a missing last_seen as a new account", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: beforeDeploy,
        profileCreatedAt: beforeDeploy,
        signupNotifiedAt: null,
        hasCharacter: false,
        hasIntake: false,
      }),
    ).toBe(false);
  });

  it("does not email when the notice flag is already set", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: afterDeploy,
        profileCreatedAt: afterDeploy,
        signupNotifiedAt: "2026-11-19T21:30:01.000Z",
        hasCharacter: false,
        hasIntake: false,
      }),
    ).toBe(false);
  });

  it("does not email when the notice column is not available", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: afterDeploy,
        profileCreatedAt: afterDeploy,
        signupNotifiedAt: undefined,
        hasCharacter: false,
        hasIntake: false,
      }),
    ).toBe(false);
  });

  it("emails an account created after this deploy", () => {
    expect(Date.parse(afterDeploy)).toBeGreaterThan(Date.parse(SIGNUP_NOTICE_AFTER_ISO));
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: afterDeploy,
        profileCreatedAt: afterDeploy,
        signupNotifiedAt: null,
        hasCharacter: true,
        hasIntake: true,
      }),
    ).toBe(true);
  });

  it("emails an account with no prior profile activity", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: beforeDeploy,
        profileCreatedAt: afterDeploy,
        signupNotifiedAt: null,
        hasCharacter: false,
        hasIntake: false,
      }),
    ).toBe(true);
  });

  it("does not email an older account that already has a character or intake", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: beforeDeploy,
        profileCreatedAt: beforeDeploy,
        signupNotifiedAt: null,
        hasCharacter: true,
        hasIntake: false,
      }),
    ).toBe(false);
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: beforeDeploy,
        profileCreatedAt: beforeDeploy,
        signupNotifiedAt: null,
        hasCharacter: false,
        hasIntake: true,
      }),
    ).toBe(false);
  });

  it("does not email an account created at the deploy instant", () => {
    expect(
      shouldNotifyNewAccount({
        authCreatedAt: SIGNUP_NOTICE_AFTER_ISO,
        profileCreatedAt: SIGNUP_NOTICE_AFTER_ISO,
        signupNotifiedAt: null,
        hasCharacter: false,
        hasIntake: false,
      }),
    ).toBe(false);
  });
});
